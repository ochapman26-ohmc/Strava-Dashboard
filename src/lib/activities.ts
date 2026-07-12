import { db } from "./db";
import type { User } from "./db/schema";
import { fetchGarminData, type GarminActivity } from "./garmin";

export async function syncActivities(user: User) {
  const garminData = await fetchGarminData({
    email: user.garminEmail,
    password: user.garminPassword,
    limit: 50,
  });

  for (const activity of garminData.activities) {
    upsertActivity(user.id, activity);
  }

  return garminData.activities.length;
}

function upsertActivity(userId: number, activity: GarminActivity) {
  db.activities.upsert({
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
  });
}

export async function updateGoalProgress(userId: number) {
  const userGoals = db.goals.findMany({ userId });
  const userActivities = db.activities.findMany({ userId }, "startDate");

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
