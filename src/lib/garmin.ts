import { mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { GarminConnect } from "garmin-connect";

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
  /** Ignored — kept for call-site compatibility */
  baseUrl?: string;
}

type GarminActivityRaw = {
  activityId?: number;
  activityName?: string;
  description?: string | null;
  distance?: number;
  movingDuration?: number;
  duration?: number;
  elapsedDuration?: number;
  elevationGain?: number | null;
  averageSpeed?: number | null;
  maxSpeed?: number | null;
  averageHR?: number | null;
  maxHR?: number | null;
  startTimeGMT?: string;
  startTimeLocal?: string;
  activityType?: { typeKey?: string };
};

function normalizeActivity(activity: GarminActivityRaw): GarminActivity | null {
  if (activity.activityId == null) return null;

  return {
    id: activity.activityId,
    name: activity.activityName || "Untitled activity",
    type: activity.activityType?.typeKey || "other",
    distance: activity.distance || 0,
    movingTime: activity.movingDuration || activity.duration || 0,
    elapsedTime:
      activity.elapsedDuration ||
      activity.duration ||
      activity.movingDuration ||
      0,
    totalElevationGain: activity.elevationGain ?? null,
    averageSpeed: activity.averageSpeed ?? null,
    maxSpeed: activity.maxSpeed ?? null,
    averageHeartrate: activity.averageHR ?? null,
    maxHeartrate: activity.maxHR ?? null,
    startDate: activity.startTimeGMT || activity.startTimeLocal || "",
    startDateLocal: activity.startTimeLocal || activity.startTimeGMT || "",
    description: activity.description ?? null,
  };
}

async function loginClient(email: string, password: string) {
  const client = new GarminConnect({
    username: email,
    password,
  });
  await client.login();
  return client;
}

export async function fetchGarminData({
  email,
  password,
  limit = 50,
}: SyncOptions): Promise<GarminSyncResult> {
  try {
    const client = await loginClient(email, password);
    const profile = await client.getUserProfile();
    const activities = (await client.getActivities(
      0,
      limit
    )) as GarminActivityRaw[];

    return {
      profile: {
        email,
        fullName: profile?.fullName ?? null,
      },
      activities: activities
        .map(normalizeActivity)
        .filter((a): a is GarminActivity => a !== null),
    };
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Garmin login/sync failed: ${error.message}`
        : "Garmin login/sync failed"
    );
  }
}

function gpxPointsFromXml(xmlText: string): [number, number][] {
  const points: [number, number][] = [];
  const pattern =
    /<trkpt[^>]*lat="([0-9.+-]+)"[^>]*lon="([0-9.+-]+)"[^>]*>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xmlText)) !== null) {
    points.push([parseFloat(match[1]), parseFloat(match[2])]);
  }
  return points;
}

async function downloadGpxText(
  client: GarminConnect,
  activityId: number
): Promise<string | null> {
  const dir = mkdtempSync(join(tmpdir(), "garmin-gpx-"));
  try {
    await client.downloadOriginalActivityData(
      { activityId },
      dir,
      "gpx"
    );
    const filePath = join(dir, `${activityId}.gpx`);
    return readFileSync(filePath, "utf-8");
  } catch {
    return null;
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

export async function fetchGarminRoutes(params: {
  email: string;
  password: string;
  limit: number;
  activityType?: string;
  baseUrl?: string;
}): Promise<{ points: [number, number][]; activityCount: number }> {
  try {
    const client = await loginClient(params.email, params.password);
    const activityType = (params.activityType || "running").toLowerCase();
    const activities = (await client.getActivities(
      0,
      Math.max(1, params.limit * 2)
    )) as GarminActivityRaw[];

    const runIds: number[] = [];
    for (const activity of activities) {
      const typeKey = activity.activityType?.typeKey?.toLowerCase() || "";
      if (
        activity.activityId != null &&
        (!activityType || typeKey === activityType || typeKey.includes(activityType))
      ) {
        runIds.push(activity.activityId);
      }
      if (runIds.length >= params.limit) break;
    }

    const heatPoints: [number, number][] = [];
    for (const activityId of runIds) {
      const xml = await downloadGpxText(client, activityId);
      if (!xml) continue;
      heatPoints.push(...gpxPointsFromXml(xml));
    }

    return {
      points: heatPoints,
      activityCount: runIds.length,
    };
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Garmin routes failed: ${error.message}`
        : "Garmin routes failed"
    );
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
