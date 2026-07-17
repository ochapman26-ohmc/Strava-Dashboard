import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { getAuthenticatedUser } from "@/lib/auth";
import { getActivitiesForUser, updateGoalProgress } from "@/lib/activities";

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

  try {
    const activities = await getActivitiesForUser(user, { forceSync: true });
    try {
      await updateGoalProgress(userId, activities);
    } catch {
      // goals are best-effort on ephemeral storage
    }
    return NextResponse.json({
      synced: activities.length,
      activities,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 }
    );
  }
}
