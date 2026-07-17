import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { initDb, db } from "@/lib/db";
import { sessionCookieOptions } from "@/lib/session";
import { fetchGarminData, splitFullName } from "@/lib/garmin";

initDb();

export async function POST(request: NextRequest) {
  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json(
      { error: "Garmin email and password are required." },
      { status: 400 }
    );
  }

  try {
    const garminData = await fetchGarminData({
      email,
      password,
      limit: 50,
      baseUrl: request.nextUrl.origin,
    });
    const { firstName, lastName } = splitFullName(garminData.profile.fullName);

    const existing = db.users.findFirst({ garminEmail: email });

    const user = existing
      ? db.users.update(existing.id, {
          garminEmail: email,
          garminPassword: password,
          firstName,
          lastName,
        })
      : db.users.insert({
          garminEmail: email,
          garminPassword: password,
          firstName,
          lastName,
          profilePhoto: null,
        });

    if (!user) {
      return NextResponse.json({ error: "Failed to save user." }, { status: 500 });
    }

    for (const activity of garminData.activities) {
      db.activities.upsert({
        id: activity.id,
        userId: user.id,
        name: activity.name,
        type: activity.type,
        distance: activity.distance,
        movingTime: activity.movingTime,
        elapsedTime: activity.elapsedTime,
        totalElevationGain: activity.totalElevationGain,
        averageSpeed: activity.averageSpeed,
        maxSpeed: activity.maxSpeed,
        averageHeartrate: activity.averageHeartrate,
        maxHeartrate: activity.maxHeartrate,
        startDate: activity.startDate,
        startDateLocal: activity.startDateLocal,
        description: activity.description,
        syncedAt: new Date().toISOString(),
      });
    }

    const cookieStore = await cookies();
    cookieStore.set(sessionCookieOptions(user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to connect to Garmin Connect.",
      },
      { status: 500 }
    );
  }
}
