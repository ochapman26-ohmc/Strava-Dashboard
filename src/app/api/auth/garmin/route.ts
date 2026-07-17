import { NextRequest, NextResponse } from "next/server";
import { initDb, db } from "@/lib/db";
import { sessionCookieOptions, stableUserId } from "@/lib/session";
import { fetchGarminData, splitFullName } from "@/lib/garmin";
import type { User } from "@/lib/db/schema";

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
    });
    const { firstName, lastName } = splitFullName(garminData.profile.fullName);

    const user: User = {
      id: stableUserId(email),
      garminEmail: email,
      garminPassword: password,
      firstName,
      lastName,
      profilePhoto: null,
      createdAt: new Date().toISOString(),
    };

    try {
      db.users.upsert(user);
    } catch {
      // Continue — session cookie is the source of truth on Vercel
    }

    for (const activity of garminData.activities) {
      try {
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
      } catch {
        // Best-effort activity persist
      }
    }

    const response = NextResponse.json({ success: true });
    const cookie = sessionCookieOptions(user);
    response.cookies.set(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      maxAge: cookie.maxAge,
      path: cookie.path,
    });
    return response;
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
