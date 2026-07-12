import { NextRequest, NextResponse } from "next/server";
import { initDb, db } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import type { DashboardWidget } from "@/lib/db/schema";

initDb();

const DEFAULT_WIDGETS: Omit<DashboardWidget, "id" | "userId" | "createdAt">[] = [
  {
    title: "Total Distance",
    type: "stat",
    metrics: ["distance"],
    aggregation: "sum",
    groupBy: "day",
    activityFilter: null,
    width: 1,
    order: 0,
    gridX: 0,
    gridY: 0,
    gridW: 1,
    gridH: 2,
  },
  {
    title: "Weekly Distance Trend",
    type: "line",
    metrics: ["distance"],
    aggregation: "sum",
    groupBy: "week",
    activityFilter: null,
    width: 2,
    order: 1,
    gridX: 0,
    gridY: 2,
    gridW: 2,
    gridH: 3,
  },
  {
    title: "Activities by Type",
    type: "bar",
    metrics: ["activityCount"],
    aggregation: "count",
    groupBy: "activity_type",
    activityFilter: null,
    width: 1,
    order: 2,
    gridX: 0,
    gridY: 5,
    gridW: 1,
    gridH: 3,
  },
  {
    title: "Running Routes",
    type: "heatmap",
    metrics: [],
    aggregation: "sum",
    groupBy: "day",
    activityFilter: "running",
    width: 2,
    order: 3,
    gridX: 0,
    gridY: 8,
    gridW: 2,
    gridH: 4,
  },
];

function seedDefaultWidgets(userId: number) {
  for (const widget of DEFAULT_WIDGETS) {
    db.dashboardWidgets.insert({ ...widget, userId });
  }
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let widgets = db.dashboardWidgets.findMany({ userId });
  if (widgets.length === 0) {
    seedDefaultWidgets(userId);
    widgets = db.dashboardWidgets.findMany({ userId });
  }

  return NextResponse.json(widgets);
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const existing = db.dashboardWidgets.findMany({ userId });
  const maxOrder = existing.reduce((max, w) => Math.max(max, w.order), -1);
  const maxY = existing.reduce(
    (max, w) => Math.max(max, (w.gridY ?? 0) + (w.gridH ?? 2)),
    0
  );

  const widget = db.dashboardWidgets.insert({
    userId,
    title: body.title || "New Widget",
    type: body.type || "stat",
    metrics: body.metrics || ["distance"],
    aggregation: body.aggregation || "sum",
    groupBy: body.groupBy || "week",
    activityFilter: body.activityFilter ?? null,
    width: body.width === 2 ? 2 : 1,
    order: maxOrder + 1,
    gridX: 0,
    gridY: maxY,
    gridW: body.width === 2 ? 2 : 1,
    gridH: body.type === "stat" ? 2 : body.type === "heatmap" ? 4 : 3,
  });

  return NextResponse.json(widget, { status: 201 });
}
