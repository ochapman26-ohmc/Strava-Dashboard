import { formatDistance, formatDuration, formatPace } from "@/lib/activities";
import type { Activity } from "@/lib/db/schema";

interface ActivityListProps {
  activities: Activity[];
}

const TYPE_COLORS: Record<string, string> = {
  Run: "bg-orange-500/20 text-orange-400",
  Ride: "bg-blue-500/20 text-blue-400",
  Swim: "bg-cyan-500/20 text-cyan-400",
  Walk: "bg-green-500/20 text-green-400",
  Hike: "bg-yellow-500/20 text-yellow-400",
};

export function ActivityList({ activities }: ActivityListProps) {
  if (activities.length === 0) {
    return (
      <div className="card p-8 text-center text-muted">
        No activities synced yet. Click &quot;Sync Activities&quot; to pull your Garmin data.
      </div>
    );
  }

  return (
    <div className="card divide-y divide-card-border">
      {activities.map((activity) => {
        const typeColor = TYPE_COLORS[activity.type] ?? "bg-gray-500/20 text-gray-400";
        const date = new Date(activity.startDate).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });

        return (
          <div key={activity.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-4">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${typeColor}`}>
                {activity.type}
              </span>
              <div>
                <p className="font-medium">{activity.name}</p>
                <p className="text-sm text-muted">{date}</p>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium">{formatDistance(activity.distance ?? 0)}</p>
              <p className="text-muted">
                {formatDuration(activity.movingTime ?? 0)}
                {activity.averageSpeed ? ` · ${formatPace(activity.averageSpeed)}` : ""}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
