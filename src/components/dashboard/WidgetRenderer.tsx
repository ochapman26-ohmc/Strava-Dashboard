"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Activity } from "@/lib/db/schema";
import type { DashboardWidget, TimeRange } from "@/lib/dashboard/types";
import {
  computeChartData,
  computeStatValue,
  filterActivities,
  formatMetricValue,
  getMetric,
} from "@/lib/dashboard/metrics";
import { formatDistance, formatDuration } from "@/lib/format";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type HeatPoint = [number, number, number];

const CHART_COLORS = ["#fc4c02", "#3b82f6", "#22c55e", "#a855f7", "#eab308"];

function HeatLayer({ points }: { points: HeatPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return undefined;

    let layer: import("leaflet").Layer | null = null;
    let cancelled = false;

    (async () => {
      const leaflet = await import("leaflet");
      await import("leaflet.heat");

      if (cancelled) return;

      const heat = leaflet as unknown as {
        heatLayer: (
          latlngs: HeatPoint[],
          options: { radius: number; blur: number; maxZoom: number }
        ) => import("leaflet").Layer;
      };

      layer = heat.heatLayer(points, {
        radius: 16,
        blur: 20,
        maxZoom: 13,
      }).addTo(map);
    })();

    return () => {
      cancelled = true;
      if (layer) map.removeLayer(layer);
    };
  }, [map, points]);

  return null;
}

function HeatmapWidget({
  timeRange,
  activityFilter,
}: {
  timeRange: TimeRange;
  activityFilter: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [points, setPoints] = useState<HeatPoint[]>([]);
  const center = useMemo<[number, number]>(() => [-33.8688, 151.2093], []);

  useEffect(() => {
    setLoading(true);
    const limit = timeRange === "7d" ? 10 : timeRange === "30d" ? 20 : 30;
    const filter = activityFilter ? `&activityType=${activityFilter}` : "";
    fetch(`/api/heatmap?limit=${limit}${filter}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load heatmap");
        return data;
      })
      .then((data) => {
        setPoints(data.points.map((p: [number, number]) => [p[0], p[1], 0.7]));
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load heatmap");
        setLoading(false);
      });
  }, [timeRange, activityFilter]);

  if (loading) return <div className="flex h-full items-center justify-center text-sm text-muted">Loading map…</div>;
  if (error) return <div className="flex h-full items-center justify-center text-sm text-red-400">{error}</div>;
  if (!points.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        No route data for this time range.
      </div>
    );
  }

  return (
    <MapContainer center={center} zoom={11} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <HeatLayer points={points} />
    </MapContainer>
  );
}

function ActivityTableWidget({ activities }: { activities: Activity[] }) {
  if (!activities.length) {
    return <div className="p-4 text-sm text-muted">No activities in this time range.</div>;
  }

  return (
    <div className="max-h-full overflow-y-auto divide-y divide-card-border">
      {activities.slice(0, 10).map((activity) => (
        <div key={activity.id} className="flex items-center justify-between px-4 py-3 text-sm">
          <div>
            <p className="font-medium">{activity.name}</p>
            <p className="text-muted">
              {new Date(activity.startDate).toLocaleDateString()} · {activity.type}
            </p>
          </div>
          <div className="text-right">
            <p>{formatDistance(activity.distance ?? 0)}</p>
            <p className="text-muted">{formatDuration(activity.movingTime ?? 0)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

interface WidgetRendererProps {
  widget: DashboardWidget;
  activities: Activity[];
  timeRange: TimeRange;
}

export function WidgetRenderer({ widget, activities, timeRange }: WidgetRendererProps) {
  const filtered = useMemo(
    () => filterActivities(activities, timeRange, widget.activityFilter),
    [activities, timeRange, widget.activityFilter]
  );

  if (widget.type === "heatmap") {
    return (
      <div className="h-full min-h-[280px]">
        <HeatmapWidget timeRange={timeRange} activityFilter={widget.activityFilter} />
      </div>
    );
  }

  if (widget.type === "table") {
    return <ActivityTableWidget activities={filtered} />;
  }

  if (widget.type === "stat") {
    const metric = widget.metrics[0] || "distance";
    const value = computeStatValue(filtered, metric, widget.aggregation);
    const metricDef = getMetric(metric);
    return (
      <div className="flex h-full flex-col justify-center px-2">
        <p className="text-sm text-muted">{metricDef?.label ?? metric}</p>
        <p className="text-3xl font-bold">{formatMetricValue(metric, value)}</p>
        <p className="mt-1 text-xs text-muted">
          {filtered.length} activities · {widget.aggregation}
        </p>
      </div>
    );
  }

  const chartData = computeChartData(
    filtered,
    widget.metrics.length ? widget.metrics : ["distance"],
    widget.aggregation,
    widget.groupBy
  );

  if (!chartData.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        No data for this time range.
      </div>
    );
  }

  const metrics = widget.metrics.length ? widget.metrics : ["distance"];

  if (widget.type === "bar") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27273a" />
          <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 11 }} />
          <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: "#14141f", border: "1px solid #27273a", borderRadius: 8 }}
          />
          <Legend />
          {metrics.map((metric, i) => (
            <Bar key={metric} dataKey={metric} fill={CHART_COLORS[i % CHART_COLORS.length]} name={getMetric(metric)?.label ?? metric} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (widget.type === "area") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27273a" />
          <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 11 }} />
          <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: "#14141f", border: "1px solid #27273a", borderRadius: 8 }}
          />
          <Legend />
          {metrics.map((metric, i) => (
            <Area
              key={metric}
              type="monotone"
              dataKey={metric}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              fillOpacity={0.2}
              name={getMetric(metric)?.label ?? metric}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27273a" />
        <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 11 }} />
        <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: "#14141f", border: "1px solid #27273a", borderRadius: 8 }}
        />
        <Legend />
        {metrics.map((metric, i) => (
          <Line
            key={metric}
            type="monotone"
            dataKey={metric}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2}
            dot={false}
            name={getMetric(metric)?.label ?? metric}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
