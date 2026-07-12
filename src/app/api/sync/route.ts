import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { getAuthenticatedUser } from "@/lib/auth";
import { syncActivities, updateGoalProgress } from "@/lib/activities";

initDb();

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getAuthenticatedUser(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const count = await syncActivities(user);
  await updateGoalProgress(userId);

  return NextResponse.json({ synced: count });
}
