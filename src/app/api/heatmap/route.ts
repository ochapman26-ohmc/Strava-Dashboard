import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { getAuthenticatedUser } from "@/lib/auth";
import { fetchGarminRoutes } from "@/lib/garmin";

initDb();

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getAuthenticatedUser(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const limit = Math.min(
    50,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "15", 10) || 15)
  );
  const activityType = url.searchParams.get("activityType") || "running";

  try {
    const data = await fetchGarminRoutes({
      email: user.garminEmail,
      password: user.garminPassword,
      limit,
      activityType,
      baseUrl: url.origin,
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Heatmap fetch failed" },
      { status: 500 }
    );
  }
}
