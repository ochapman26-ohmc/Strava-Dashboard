import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { getAuthenticatedUser } from "@/lib/auth";
import { getActivitiesForUser } from "@/lib/activities";
import { METRICS } from "@/lib/dashboard/metrics";
import type { TimeRange } from "@/lib/dashboard/types";

initDb();

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getAuthenticatedUser(userId);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let activities: Awaited<ReturnType<typeof getActivitiesForUser>> = [];
  try {
    activities = await getActivitiesForUser(user);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load activities from Garmin",
        metrics: METRICS,
        activityTypes: [],
        timeRanges: [],
        activities: [],
      },
      { status: 500 }
    );
  }

  const activityTypes = [...new Set(activities.map((a) => a.type))];

  return NextResponse.json({
    metrics: METRICS,
    activityTypes,
    timeRanges: [
      { key: "7d", label: "Last 7 days" },
      { key: "30d", label: "Last 30 days" },
      { key: "90d", label: "Last 90 days" },
      { key: "180d", label: "Last 6 months" },
      { key: "365d", label: "Last year" },
      { key: "all", label: "All time" },
    ] satisfies { key: TimeRange; label: string }[],
    activities,
  });
}
