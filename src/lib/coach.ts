import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db";
import { formatDistance, formatDuration, formatPace } from "./format";
import type { User, Goal, Activity } from "./db/schema";
import {
  filterActivities,
  computeStatValue,
  computeChartData,
  formatMetricValue,
  getMetric,
} from "./dashboard/metrics";
import type { TimeRange, Aggregation, GroupBy } from "./dashboard/types";

const SYSTEM_PROMPT = `You are an expert endurance sports coach with deep knowledge of running, cycling, and triathlon training. You provide personalized, actionable coaching based on the athlete's Garmin Connect data and stated goals.

Your coaching style:
- Be encouraging but honest — celebrate wins and address gaps constructively
- Give specific, actionable advice (not generic platitudes)
- Reference the athlete's actual data when giving feedback
- Consider training load, recovery, and injury prevention
- Use appropriate sports science terminology but explain when needed
- Keep responses concise and focused (2-4 paragraphs unless asked for more detail)
- When discussing paces/speeds, use the athlete's preferred units

You have access to the athlete's recent activities, stats, and goals. Use this context to personalize every response.`;

const DASHBOARD_INSIGHT_PROMPT = `You are an expert endurance sports coach reviewing an athlete's personalized training dashboard. Analyze what the dashboard shows in the context of their goals.

Structure your response with these sections:
1. **Dashboard Overview** — What story does the current data tell?
2. **Goal Progress** — How are they tracking against each goal? Be specific with numbers.
3. **Key Observations** — Notable patterns, strengths, or concerns from the metrics shown.
4. **Recommendations** — 2-3 actionable coaching recommendations for the coming week.

Be direct, specific, and reference actual numbers from the dashboard. If goals are not set, encourage setting them and still provide training insights.`;

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

function getModel() {
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
}

async function callClaude(params: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
}): Promise<string> {
  const client = getAnthropicClient();
  if (!client) {
    return "AI coaching is not configured yet. Please add your ANTHROPIC_API_KEY to the environment variables.";
  }

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: params.maxTokens ?? 800,
    system: params.system,
    messages: params.messages,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.type === "text"
    ? textBlock.text
    : "I couldn't generate a response. Please try again.";
}

function buildAthleteContext(
  user: User,
  recentActivities: ReturnType<typeof db.activities.findMany>,
  userGoals: ReturnType<typeof db.goals.findMany>
) {
  const activitySummary = recentActivities
    .slice(0, 15)
    .map((a) => {
      const date = new Date(a.startDate).toLocaleDateString();
      const dist = formatDistance(a.distance ?? 0);
      const time = formatDuration(a.movingTime ?? 0);
      const pace = a.averageSpeed ? formatPace(a.averageSpeed) : "—";
      const hr = a.averageHeartrate ? `, avg HR ${Math.round(a.averageHeartrate)}bpm` : "";
      return `- ${date}: ${a.name} (${a.type}) — ${dist}, ${time}, pace ${pace}${hr}`;
    })
    .join("\n");

  const goalsSummary =
    userGoals.length > 0
      ? userGoals
          .map((g) => {
            const progress = g.currentValue ?? 0;
            const pct = g.targetValue > 0 ? Math.round((progress / g.targetValue) * 100) : 0;
            return `- ${g.title}: ${progress}/${g.targetValue} ${g.unit} (${pct}% complete)${g.deadline ? `, deadline ${g.deadline}` : ""}`;
          })
          .join("\n")
      : "No goals set yet.";

  const totalDistance = recentActivities.reduce((s, a) => s + (a.distance ?? 0), 0);
  const totalTime = recentActivities.reduce((s, a) => s + (a.movingTime ?? 0), 0);

  return `
Athlete: ${user.firstName} ${user.lastName}
Activities in database: ${recentActivities.length}
Total distance (all synced): ${formatDistance(totalDistance)}
Total moving time: ${formatDuration(totalTime)}

Recent activities:
${activitySummary || "No activities synced yet."}

Current goals:
${goalsSummary}
`.trim();
}

export async function generateCoachResponse(
  user: User,
  userMessage: string
): Promise<string> {
  const recentActivities = db.activities.findMany({ userId: user.id }, "startDate").slice(0, 30);
  const userGoals = db.goals.findMany({ userId: user.id });
  const chatHistory = db.coachMessages.findMany({ userId: user.id }, 10);

  const context = buildAthleteContext(user, recentActivities, userGoals);

  return callClaude({
    system: `${SYSTEM_PROMPT}\n\nCurrent athlete context:\n${context}`,
    messages: [
      ...chatHistory.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: userMessage },
    ],
  });
}

export async function generateWeeklyFeedback(user: User): Promise<string> {
  return generateCoachResponse(
    user,
    "Give me a weekly training review based on my recent activities and goals. Highlight what went well, areas for improvement, and specific recommendations for next week."
  );
}

export async function generateDashboardInsights(
  user: User,
  timeRange: string,
  widgets: Array<{
    title: string;
    type: string;
    metrics: string[];
    aggregation: string;
    groupBy: string;
    activityFilter: string | null;
  }>,
  activities: Activity[],
  goals: Goal[]
): Promise<string> {
  const range = timeRange as TimeRange;
  const filtered = filterActivities(activities, range, null);

  const widgetSummaries = widgets.map((widget) => {
    const widgetActivities = filterActivities(activities, range, widget.activityFilter);

    if (widget.type === "heatmap") {
      return `- ${widget.title} (heatmap): ${widgetActivities.length} activities with route data potential, filter: ${widget.activityFilter || "all"}`;
    }
    if (widget.type === "table") {
      return `- ${widget.title} (table): showing ${Math.min(widgetActivities.length, 10)} of ${widgetActivities.length} activities`;
    }
    if (widget.type === "stat") {
      const metric = widget.metrics[0] || "distance";
      const value = computeStatValue(widgetActivities, metric, widget.aggregation as Aggregation);
      return `- ${widget.title} (stat): ${getMetric(metric)?.label ?? metric} = ${formatMetricValue(metric, value)} (${widget.aggregation} over ${timeRange})`;
    }

    const metrics = widget.metrics.length ? widget.metrics : ["distance"];
    const chartData = computeChartData(
      widgetActivities,
      metrics,
      widget.aggregation as Aggregation,
      widget.groupBy as GroupBy
    );
    const latest = chartData[chartData.length - 1];
    const summary = metrics
      .map((m) => `${getMetric(m)?.label ?? m}: ${latest ? latest[m] : "n/a"}`)
      .join(", ");
    return `- ${widget.title} (${widget.type}): ${chartData.length} data points, latest — ${summary}`;
  }).join("\n");

  const goalsSummary =
    goals.length > 0
      ? goals
          .map((g) => {
            const progress = g.currentValue ?? 0;
            const pct = g.targetValue > 0 ? Math.round((progress / g.targetValue) * 100) : 0;
            return `- ${g.title}: ${progress}/${g.targetValue} ${g.unit} (${pct}%)${g.deadline ? `, due ${g.deadline}` : ""}`;
          })
          .join("\n")
      : "No goals set.";

  const activityBreakdown = [...new Set(filtered.map((a) => a.type))]
    .map((type) => {
      const count = filtered.filter((a) => a.type === type).length;
      return `${type}: ${count}`;
    })
    .join(", ");

  const context = `
Athlete: ${user.firstName} ${user.lastName}
Dashboard time range: ${timeRange}
Activities in range: ${filtered.length}
Activity breakdown: ${activityBreakdown || "none"}

Dashboard widgets and their current values:
${widgetSummaries || "No widgets configured."}

Goals:
${goalsSummary}
`.trim();

  return callClaude({
    system: `${DASHBOARD_INSIGHT_PROMPT}\n\nDashboard context:\n${context}`,
    messages: [
      {
        role: "user",
        content: `Analyze my dashboard for the ${timeRange} period. How am I progressing toward my goals, and what should I focus on?`,
      },
    ],
    maxTokens: 1000,
  });
}
