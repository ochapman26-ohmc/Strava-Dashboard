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

export async function fetchGarminData({
  email,
  password,
  limit = 50,
}: SyncOptions): Promise<GarminSyncResult> {
  const scriptPath = join(process.cwd(), "scripts", "garmin_sync.py");
  const localPython = join(process.cwd(), ".venv", "bin", "python");
  const pythonExecutable = existsSync(localPython) ? localPython : "python3";

  return new Promise((resolve, reject) => {
    const child = spawn(
      pythonExecutable,
      [scriptPath, "--email", email, "--password", password, "--limit", String(limit)],
      {
        env: {
          ...process.env,
          PYTHONUNBUFFERED: "1",
        },
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Garmin sync failed with exit code ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout) as GarminSyncResult);
      } catch (error) {
        reject(
          new Error(
            `Failed to parse Garmin sync response: ${
              error instanceof Error ? error.message : "unknown error"
            }`
          )
        );
      }
    });
  });
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
