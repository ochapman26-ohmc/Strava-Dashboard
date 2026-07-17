import { spawn } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

export interface GarminProfile {
  email: string;
  fullName: string | null;
}

export interface GarminActivity {
  id: number;
  name: string;
  type: string;
  distance: number;
  movingTime: number;
  elapsedTime: number;
  totalElevationGain: number | null;
  averageSpeed: number | null;
  maxSpeed: number | null;
  averageHeartrate: number | null;
  maxHeartrate: number | null;
  startDate: string;
  startDateLocal: string;
  description: string | null;
}

export interface GarminSyncResult {
  profile: GarminProfile;
  activities: GarminActivity[];
}

interface SyncOptions {
  email: string;
  password: string;
  limit?: number;
}

function isVercelRuntime() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

function getInternalBaseUrl() {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  return "http://127.0.0.1:3000";
}

function getInternalSecret() {
  return (
    process.env.GARMIN_INTERNAL_SECRET ||
    process.env.ANTHROPIC_API_KEY ||
    ""
  );
}

async function fetchViaPythonApi(
  path: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const response = await fetch(`${getInternalBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": getInternalSecret(),
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : `Garmin API failed (${response.status})`
    );
  }
  return payload;
}

function runLocalPythonScript(
  scriptName: string,
  args: string[]
): Promise<string> {
  const scriptPath = join(process.cwd(), "scripts", scriptName);
  const localPython = join(process.cwd(), ".venv", "bin", "python");
  const pythonExecutable = existsSync(localPython) ? localPython : "python3";

  return new Promise((resolve, reject) => {
    const child = spawn(pythonExecutable, [scriptPath, ...args], {
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(
        new Error(
          error.message.includes("ENOENT")
            ? "Python is not available. Install Python 3 locally, or deploy with the Vercel Python API routes."
            : error.message
        )
      );
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Garmin script failed with exit code ${code}`));
        return;
      }
      resolve(stdout);
    });
  });
}

export async function fetchGarminData({
  email,
  password,
  limit = 50,
}: SyncOptions): Promise<GarminSyncResult> {
  if (isVercelRuntime()) {
    return (await fetchViaPythonApi("/api/garmin-sync", {
      email,
      password,
      limit,
    })) as GarminSyncResult;
  }

  const stdout = await runLocalPythonScript("garmin_sync.py", [
    "--email",
    email,
    "--password",
    password,
    "--limit",
    String(limit),
  ]);

  try {
    return JSON.parse(stdout) as GarminSyncResult;
  } catch (error) {
    throw new Error(
      `Failed to parse Garmin sync response: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
  }
}

export async function fetchGarminRoutes(params: {
  email: string;
  password: string;
  limit: number;
  activityType?: string;
}): Promise<{ points: [number, number][]; activityCount: number }> {
  if (isVercelRuntime()) {
    return (await fetchViaPythonApi("/api/garmin-routes", {
      email: params.email,
      password: params.password,
      limit: params.limit,
      activityType: params.activityType || "running",
    })) as { points: [number, number][]; activityCount: number };
  }

  const stdout = await runLocalPythonScript("garmin_routes.py", [
    "--email",
    params.email,
    "--password",
    params.password,
    "--limit",
    String(params.limit),
    "--activity-type",
    params.activityType || "running",
  ]);

  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error("Failed to parse garmin_routes.py output");
  }
}

export function splitFullName(fullName: string | null) {
  if (!fullName) {
    return { firstName: null, lastName: null };
  }

  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  return {
    firstName: firstName || null,
    lastName: rest.length > 0 ? rest.join(" ") : null,
  };
}
