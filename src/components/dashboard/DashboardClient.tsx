"use client";

import { useCallback, useEffect, useState } from "react";
import type { Activity } from "@/lib/db/schema";
import type { DashboardWidget, TimeRange, WidgetFormData, WidgetType, Aggregation, GroupBy } from "@/lib/dashboard/types";
import { SyncButton } from "@/components/SyncButton";
import { AddWidgetModal } from "./AddWidgetModal";
import { DashboardGrid } from "./DashboardGrid";
import { AiInsightsPanel } from "./AiInsightsPanel";

interface DashboardClientProps {
  userName: string | null;
}

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "180d", label: "6 months" },
  { key: "365d", label: "1 year" },
  { key: "all", label: "All time" },
];

export function DashboardClient({ userName }: DashboardClientProps) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [editMode, setEditMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    const [widgetsRes, catalogRes] = await Promise.all([
      fetch("/api/dashboard/widgets"),
      fetch("/api/dashboard/catalog"),
    ]);

    if (widgetsRes.ok) {
      const raw = await widgetsRes.json();
      setWidgets(
        raw.map((w: DashboardWidget) => ({
          ...w,
          type: w.type as WidgetType,
          aggregation: w.aggregation as Aggregation,
          groupBy: w.groupBy as GroupBy,
          width: (w.width === 2 ? 2 : 1) as 1 | 2,
          gridX: w.gridX ?? 0,
          gridY: w.gridY ?? 0,
          gridW: w.gridW ?? w.width ?? 1,
          gridH: w.gridH ?? 3,
        }))
      );
    }
    if (catalogRes.ok) {
      const catalog = await catalogRes.json();
      setActivities(catalog.activities ?? []);
    }
    setLoading(false);
  }, []);

  const handleSynced = useCallback(
    (syncedActivities?: Activity[]) => {
      if (syncedActivities?.length) {
        setActivities(syncedActivities);
      } else {
        void loadDashboard();
      }
    },
    [loadDashboard]
  );
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function handleAddWidget(data: WidgetFormData) {
    const res = await fetch("/api/dashboard/widgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const widget = await res.json();
      setWidgets((prev) => [...prev, widget]);
    }
  }

  async function handleDeleteWidget(id: number) {
    await fetch(`/api/dashboard/widgets/${id}`, { method: "DELETE" });
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  }

  if (loading) {
    return <div className="py-20 text-center text-muted">Loading dashboard…</div>;
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {userName}</h1>
          <p className="mt-1 text-sm text-muted">
            {editMode
              ? "Drag widgets to rearrange · grab the corner to resize"
              : "Your customizable training dashboard"}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none"
          >
            {TIME_RANGES.map((range) => (
              <option key={range.key} value={range.key}>
                {range.label}
              </option>
            ))}
          </select>
          <SyncButton onSynced={handleSynced} />
          <button
            onClick={() => setEditMode((e) => !e)}
            className={editMode ? "btn-primary text-sm" : "btn-secondary text-sm"}
          >
            {editMode ? "Done Editing" : "Edit Dashboard"}
          </button>
          {editMode && (
            <button onClick={() => setModalOpen(true)} className="btn-secondary text-sm">
              + Add Widget
            </button>
          )}
          <AiInsightsPanel timeRange={timeRange} />
        </div>
      </div>

      {widgets.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="mb-4 text-muted">Your dashboard is empty.</p>
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            Add your first widget
          </button>
        </div>
      ) : (
        <DashboardGrid
          widgets={widgets}
          activities={activities}
          timeRange={timeRange}
          editMode={editMode}
          onLayoutSaved={setWidgets}
          onDeleteWidget={handleDeleteWidget}
        />
      )}

      <AddWidgetModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAddWidget}
      />
    </>
  );
}
