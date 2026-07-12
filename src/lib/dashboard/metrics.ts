import type { Activity } from "@/lib/db/schema";
import type { Aggregation, GroupBy, TimeRange } from "./types";
import { formatDistance, formatDuration, formatPace } from "@/lib/format";

export interface MetricDefinition {
  key: string;
  label: string;
  unit: string;
  aggregatable: boolean;
  chartable: boolean;
  description: string;
}

export const METRICS: MetricDefinition[] = [
  { key: "distance", label: "Distance", unit: "km", aggregatable: true, chartable: true, description: "Total distance covered" },
  { key: "movingTime", label: "Moving Time", unit: "min", aggregatable: true, chartable: true, description: "Time spent moving" },
  { key: "elapsedTime", label: "Elapsed Time", unit: "min", aggregatable: true, chartable: true, description: "Total elapsed time" },
  { key: "totalElevationGain", label: "Elevation Gain", unit: "m", aggregatable: true, chartable: true, description: "Total elevation climbed" },
  { key: "averageSpeed", label: "Average Speed", unit: "km/h", aggregatable: true, chartable: true, description: "Mean speed across activities" },
  { key: "maxSpeed", label: "Max Speed", unit: "km/h", aggregatable: true, chartable: true, description: "Peak speed recorded" },
  { key: "averageHeartrate", label: "Average Heart Rate", unit: "bpm", aggregatable: true, chartable: true, description: "Mean heart rate" },
  { key: "maxHeartrate", label: "Max Heart Rate", unit: "bpm", aggregatable: true, chartable: true, description: "Peak heart rate" },
  { key: "pace", label: "Pace", unit: "min/km", aggregatable: true, chartable: true, description: "Average pace (from speed)" },
  { key: "activityCount", label: "Activity Count", unit: "activities", aggregatable: true, chartable: true, description: "Number of activities" },
];

export const ACTIVITY_TYPES = [
  "running",
  "cycling",
  "swimming",
  "walking",
  "hiking",
  "other",
];

export const WIDGET_TYPES = [
  { key: "stat", label: "Stat Card", description: "Single aggregated number" },
  { key: "bar", label: "Bar Chart", description: "Compare values across time or categories" },
  { key: "line", label: "Line Graph", description: "Trend over time" },
  { key: "area", label: "Area Chart", description: "Filled trend over time" },
  { key: "heatmap", label: "Route Heatmap", description: "Map of where you ran" },
  { key: "table", label: "Activity Table", description: "List of recent activities" },
] as const;

export function getMetric(key: string): MetricDefinition | undefined {
  return METRICS.find((m) => m.key === key);
}

export function getRangeStart(range: TimeRange): Date | null {
  if (range === "all") return null;
  const days = { "7d": 7, "30d": 30, "90d": 90, "180d": 180, "365d": 365 }[range];
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function filterActivities(
  activities: Activity[],
  range: TimeRange,
  activityFilter: string | null
): Activity[] {
  const start = getRangeStart(range);
  return activities.filter((a) => {
    if (activityFilter && a.type.toLowerCase() !== activityFilter.toLowerCase()) {
      return false;
    }
    if (start && new Date(a.startDate) < start) return false;
    return true;
  });
}

function rawMetricValue(activity: Activity, metricKey: string): number | null {
  switch (metricKey) {
    case "distance":
      return activity.distance ?? null;
    case "movingTime":
      return activity.movingTime ?? null;
    case "elapsedTime":
      return activity.elapsedTime ?? null;
    case "totalElevationGain":
      return activity.totalElevationGain ?? null;
    case "averageSpeed":
      return activity.averageSpeed ?? null;
    case "maxSpeed":
      return activity.maxSpeed ?? null;
    case "averageHeartrate":
      return activity.averageHeartrate ?? null;
    case "maxHeartrate":
      return activity.maxHeartrate ?? null;
    case "pace":
      return activity.averageSpeed ? 1000 / activity.averageSpeed : null;
    case "activityCount":
      return 1;
    default:
      return null;
  }
}

export function normalizeMetricValue(metricKey: string, value: number): number {
  switch (metricKey) {
    case "distance":
      return value / 1000;
    case "movingTime":
    case "elapsedTime":
    case "pace":
      return value / 60;
    case "averageSpeed":
    case "maxSpeed":
      return value * 3.6;
    default:
      return value;
  }
}

function aggregateValues(values: number[], aggregation: Aggregation): number {
  if (values.length === 0) return 0;
  switch (aggregation) {
    case "sum":
      return values.reduce((s, v) => s + v, 0);
    case "avg":
      return values.reduce((s, v) => s + v, 0) / values.length;
    case "max":
      return Math.max(...values);
    case "min":
      return Math.min(...values);
    case "count":
      return values.length;
  }
}

export function computeStatValue(
  activities: Activity[],
  metricKey: string,
  aggregation: Aggregation
): number {
  if (metricKey === "activityCount") {
    return activities.length;
  }

  const values = activities
    .map((a) => rawMetricValue(a, metricKey))
    .filter((v): v is number => v !== null)
    .map((v) => normalizeMetricValue(metricKey, v));

  return aggregateValues(values, aggregation);
}

function periodKey(date: Date, groupBy: GroupBy): string {
  if (groupBy === "activity_type") return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  if (groupBy === "day") return `${y}-${m}-${d}`;
  if (groupBy === "week") {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    return weekStart.toISOString().slice(0, 10);
  }
  return `${y}-${m}`;
}

export interface ChartDataPoint {
  label: string;
  [metricKey: string]: string | number;
}

export function computeChartData(
  activities: Activity[],
  metrics: string[],
  aggregation: Aggregation,
  groupBy: GroupBy
): ChartDataPoint[] {
  if (groupBy === "activity_type") {
    const types = [...new Set(activities.map((a) => a.type))];
    return types.map((type) => {
      const typeActivities = activities.filter((a) => a.type === type);
      const point: ChartDataPoint = { label: type };
      for (const metric of metrics) {
        point[metric] = computeStatValue(typeActivities, metric, aggregation);
      }
      return point;
    });
  }

  const buckets = new Map<string, Activity[]>();
  for (const activity of activities) {
    const key = periodKey(new Date(activity.startDate), groupBy);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(activity);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, bucketActivities]) => {
      const point: ChartDataPoint = { label };
      for (const metric of metrics) {
        point[metric] = computeStatValue(bucketActivities, metric, aggregation);
      }
      return point;
    });
}

export function formatMetricValue(metricKey: string, value: number): string {
  const metric = getMetric(metricKey);
  if (!metric) return String(value);

  switch (metricKey) {
    case "distance":
      return formatDistance(value * 1000);
    case "movingTime":
    case "elapsedTime":
      return formatDuration(value * 60);
    case "pace": {
      const mps = 1000 / (value * 60);
      return formatPace(mps);
    }
    case "averageSpeed":
    case "maxSpeed":
      return `${value.toFixed(1)} km/h`;
    case "activityCount":
      return String(Math.round(value));
    default:
      return `${value.toFixed(1)} ${metric.unit}`;
  }
}
