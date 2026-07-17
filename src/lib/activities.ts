import { db } from "./db";
import type { Activity, User } from "./db/schema";
import { fetchGarminData, type GarminActivity } from "./garmin";

type CacheEntry = { at: number; activities: Activity[] };

const globalForCache = globalThis as typeof globalThis & {
  __strideActivityCache?: Map<number, CacheEntry>;
};

function getCache() {
  if (!globalForCache.__strideActivityCache) {
    globalForCache.__strideActivityCache = new Map();
  }
  return globalForCache.__strideActivityCache;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

function toActivity(userId: number, activity: GarminActivity): Activity {
  return {
    id: activity.id,
    userId,
    name: activity.name,
    type: activity.type,
    distance: activity.distance,
    movingTime: activity.movingTime,
    elapsedTime: activity.elapsedTime,
    totalElevationGain: activity.totalElevationGain,
    averageSpeed: activity.averageSpeed,
    maxSpeed: activity.maxSpeed,
    averageHeartrate: activity.averageHeartrate ?? null,
    maxHeartrate: activity.maxHeartrate ?? null,
    startDate: activity.startDate,
    startDateLocal: activity.startDateLocal,
    description: activity.description ?? null,
    syncedAt: new Date().toISOString(),
  };
}

function persistActivities(userId: number, activities: Activity[]) {
  for (const activity of activities) {
    try {
      db.activities.upsert(activity);
    } catch {
      // Ephemeral FS on Vercel may fail — memory/cache still holds data
    }
  }
  getCache().set(userId, { at: Date.now(), activities });
}

/** Pull from Garmin and return activities (does not rely on durable DB). */
export async function syncActivities(user: User, limit = 50): Promise<Activity[]> {
  const garminData = await fetchGarminData({
    email: user.garminEmail,
    password: user.garminPassword,
    limit,
  });

  const activities = garminData.activities.map((a) => toActivity(user.id, a));
  persistActivities(user.id, activities);
  return activities;
}

/**
 * Resolve activities for widgets/coach/goals.
 * Order: memory cache → local DB → live Garmin sync.
 */
export async function getActivitiesForUser(
  user: User,
  options?: { forceSync?: boolean; limit?: number }
): Promise<Activity[]> {
  const cache = getCache();
  const cached = cache.get(user.id);
  if (
    !options?.forceSync &&
    cached &&
    Date.now() - cached.at < CACHE_TTL_MS &&
    cached.activities.length > 0
  ) {
    return cached.activities;
  }

  if (!options?.forceSync) {
    try {
      const fromDb = db.activities.findMany({ userId: user.id }, "startDate");
      if (fromDb.length > 0) {
        cache.set(user.id, { at: Date.now(), activities: fromDb });
        return fromDb;
      }
    } catch {
      // ignore DB read failures
    }
  }

  return syncActivities(user, options?.limit ?? 50);
}

export async function updateGoalProgress(userId: number, activities?: Activity[]) {
  const userGoals = db.goals.findMany({ userId });
  const userActivities =
    activities ?? db.activities.findMany({ userId }, "startDate");

  for (const goal of userGoals) {
    if (goal.status !== "active") continue;

    let currentValue = 0;

    switch (goal.targetType) {
      case "weekly_distance":
        currentValue = getWeeklyDistance(userActivities, goal.unit);
        break;
      case "monthly_activities":
        currentValue = getMonthlyActivityCount(userActivities);
        break;
      case "total_distance":
        currentValue = getTotalDistance(userActivities, goal.unit);
        break;
      default:
        currentValue = goal.currentValue ?? 0;
    }

    db.goals.update(goal.id, { currentValue });
  }
}

function getWeeklyDistance(
  acts: { distance: number | null; startDate: string }[],
  unit: string
) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const totalMeters = acts
    .filter((a) => new Date(a.startDate) >= weekAgo)
    .reduce((sum, a) => sum + (a.distance ?? 0), 0);

  return unit === "km" ? totalMeters / 1000 : totalMeters / 1609.34;
}

function getMonthlyActivityCount(acts: { startDate: string }[]) {
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  return acts.filter((a) => new Date(a.startDate) >= monthAgo).length;
}

function getTotalDistance(
  acts: { distance: number | null }[],
  unit: string
) {
  const totalMeters = acts.reduce((sum, a) => sum + (a.distance ?? 0), 0);
  return unit === "km" ? totalMeters / 1000 : totalMeters / 1609.34;
}

export { formatDistance, formatDuration, formatPace } from "./format";
