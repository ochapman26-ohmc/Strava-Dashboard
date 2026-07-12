import { NextRequest, NextResponse } from "next/server";
import { initDb, db } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { getAuthenticatedUser } from "@/lib/auth";
import { generateDashboardInsights } from "@/lib/coach";
import type { TimeRange } from "@/lib/dashboard/types";

initDb();

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getAuthenticatedUser(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await request.json();
  const timeRange = (body.timeRange || "30d") as TimeRange;

  const widgets = db.dashboardWidgets.findMany({ userId });
  const activities = db.activities.findMany({ userId }, "startDate");
  const goals = db.goals.findMany({ userId });

  try {
    const insight = await generateDashboardInsights(
      user,
      timeRange,
      widgets,
      activities,
      goals
    );
    return NextResponse.json({ insight });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate insights",
      },
      { status: 500 }
    );
  }
}
