export type WidgetType = "stat" | "bar" | "line" | "area" | "heatmap" | "table";

export type Aggregation = "sum" | "avg" | "max" | "min" | "count";

export type GroupBy = "day" | "week" | "month" | "activity_type";

export type TimeRange = "7d" | "30d" | "90d" | "180d" | "365d" | "all";

export interface DashboardWidget {
  id: number;
  userId: number;
  title: string;
  type: WidgetType;
  metrics: string[];
  aggregation: Aggregation;
  groupBy: GroupBy;
  activityFilter: string | null;
  width: 1 | 2;
  order: number;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  createdAt: string;
}

export interface WidgetFormData {
  title: string;
  type: WidgetType;
  metrics: string[];
  aggregation: Aggregation;
  groupBy: GroupBy;
  activityFilter: string | null;
  width: 1 | 2;
}
