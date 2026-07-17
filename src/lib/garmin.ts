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
  /** Origin of the current request, e.g. https://your-app.vercel.app */
  baseUrl?: string;
}

function isVercelRuntime() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

function sanitizeSecret(value: string | undefined): string {
  if (!value) return "";
  const firstLine = value.split(/\r?\n/)[0]?.trim() ?? "";
  return firstLine.split(/\s+/)[0] ?? "";
}

function getInternalBaseUrl(explicit?: string) {
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://127.0.0.1:3000";
}

async function fetchViaPythonApi(
  path: string,
  body: Record<string, unknown>,
  baseUrl?: string
): Promise<unknown> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Dedicated internal secret only (do not reuse the Anthropic key as a header)
  const secret = sanitizeSecret(process.env.GARMIN_INTERNAL_SECRET);
  if (secret) {
    headers["x-internal-secret"] = secret;
  }

  // Bypass Vercel Deployment Protection for server-to-server calls
  const bypass = sanitizeSecret(process.env.VERCEL_AUTOMATION_BYPASS_SECRET);
  if (bypass) {
    headers["x-vercel-protection-bypass"] = bypass;
  }

  const url = `${getInternalBaseUrl(baseUrl)}${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload: { error?: string; [key: string]: unknown } = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    if (typeof payload.error === "string") {
      throw new Error(payload.error);
    }
    if (response.status === 401) {
      throw new Error(
        "Garmin sync endpoint returned 401. If Deployment Protection is on, add VERCEL_AUTOMATION_BYPASS_SECRET in Vercel env, or disable Protection for this project."
      );
    }
    if (response.status === 404) {
      throw new Error(
        "Garmin Python API route not found (404). Redeploy and confirm /api/garmin-sync.py is included in the Vercel build."
      );
    }
    throw new Error(
      `Garmin API failed (${response.status})${text ? `: ${text.slice(0, 200)}` : ""}`
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
  baseUrl,
}: SyncOptions): Promise<GarminSyncResult> {
  if (isVercelRuntime()) {
    return (await fetchViaPythonApi(
      "/api/garmin-sync",
      { email, password, limit },
      baseUrl
    )) as GarminSyncResult;
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
  baseUrl?: string;
}): Promise<{ points: [number, number][]; activityCount: number }> {
  if (isVercelRuntime()) {
    return (await fetchViaPythonApi(
      "/api/garmin-routes",
      {
        email: params.email,
        password: params.password,
        limit: params.limit,
        activityType: params.activityType || "running",
      },
      params.baseUrl
    )) as { points: [number, number][]; activityCount: number };
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
