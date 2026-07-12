import { NextRequest, NextResponse } from "next/server";
import { initDb, db } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

initDb();

export async function PUT(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const layouts = body.layouts as Array<{
    id: number;
    gridX: number;
    gridY: number;
    gridW: number;
    gridH: number;
    width: number;
    order: number;
  }>;

  if (!Array.isArray(layouts)) {
    return NextResponse.json({ error: "Invalid layout" }, { status: 400 });
  }

  db.dashboardWidgets.updateLayout(userId, layouts);
  return NextResponse.json({ success: true });
}
