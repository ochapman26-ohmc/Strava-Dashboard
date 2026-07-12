import { NextRequest, NextResponse } from "next/server";
import { initDb, db } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

initDb();

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const goalId = parseInt(id, 10);

  db.goals.delete(goalId, userId);

  return NextResponse.json({ success: true });
}
