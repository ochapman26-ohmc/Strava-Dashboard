import { NextRequest, NextResponse } from "next/server";
import { initDb, db } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { getAuthenticatedUser } from "@/lib/auth";
import { generateCoachResponse, generateWeeklyFeedback } from "@/lib/coach";

initDb();

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const messages = db.coachMessages.findMany({ userId }, 50);
  return NextResponse.json(messages);
}

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
  const { message, weeklyReview } = body;

  if (!message && !weeklyReview) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  if (!weeklyReview) {
    db.coachMessages.insert({
      userId,
      role: "user",
      content: message,
    });
  }

  const response = weeklyReview
    ? await generateWeeklyFeedback(user)
    : await generateCoachResponse(user, message);

  db.coachMessages.insert({
    userId,
    role: "assistant",
    content: response,
  });

  return NextResponse.json({ role: "assistant", content: response });
}
