import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { getAuthenticatedUser } from "@/lib/auth";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

initDb();

function runGarminRoutesScript(params: {
  email: string;
  password: string;
  limit: number;
  activityType?: string;
}) {
  const scriptPath = join(process.cwd(), "scripts", "garmin_routes.py");
  const localPython = join(process.cwd(), ".venv", "bin", "python");
  const pythonExecutable = existsSync(localPython) ? localPython : "python3";

  return new Promise<{ points: [number, number][]; activityCount: number }>(
    (resolve, reject) => {
      const child = spawn(pythonExecutable, [
        scriptPath,
        "--email",
        params.email,
        "--password",
        params.password,
        "--limit",
        String(params.limit),
        "--activity-type",
        params.activityType || "running",
      ]);

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("error", (err) => reject(err));
      child.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(stderr || `garmin_routes.py exited with ${code}`));
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch {
          reject(new Error("Failed to parse garmin_routes.py output"));
        }
      });
    }
  );
}

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
    const data = await runGarminRoutesScript({
      email: user.garminEmail,
      password: user.garminPassword,
      limit,
      activityType,
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Heatmap fetch failed" },
      { status: 500 }
    );
  }
}
