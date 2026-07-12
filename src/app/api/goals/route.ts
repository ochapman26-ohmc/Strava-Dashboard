import { NextRequest, NextResponse } from "next/server";
import { initDb, db } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

initDb();

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userGoals = db.goals.findMany({ userId });
  return NextResponse.json(userGoals);
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, targetType, targetValue, unit, deadline } = body;

  if (!title || !targetType || !targetValue || !unit) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const goal = db.goals.insert({
    userId,
    title,
    description: description || null,
    targetType,
    targetValue: parseFloat(targetValue),
    unit,
    deadline: deadline || null,
  });

  return NextResponse.json(goal, { status: 201 });
}
