"use client";

import { useState } from "react";
import type { WidgetFormData, WidgetType } from "@/lib/dashboard/types";
import {
  ACTIVITY_TYPES,
  METRICS,
  WIDGET_TYPES,
} from "@/lib/dashboard/metrics";

interface AddWidgetModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: WidgetFormData) => Promise<void>;
}

const DEFAULT_FORM: WidgetFormData = {
  title: "",
  type: "stat",
  metrics: ["distance"],
  aggregation: "sum",
  groupBy: "week",
  activityFilter: null,
  width: 1,
};

export function AddWidgetModal({ open, onClose, onAdd }: AddWidgetModalProps) {
  const [form, setForm] = useState<WidgetFormData>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const needsMetrics = form.type !== "heatmap" && form.type !== "table";
  const needsGroupBy = ["bar", "line", "area"].includes(form.type);
  const allowsMultipleMetrics = ["bar", "line", "area"].includes(form.type);

  function toggleMetric(key: string) {
    if (!allowsMultipleMetrics) {
      setForm((f) => ({ ...f, metrics: [key] }));
      return;
    }
    setForm((f) => ({
      ...f,
      metrics: f.metrics.includes(key)
        ? f.metrics.filter((m) => m !== key)
        : [...f.metrics, key],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await onAdd({
      ...form,
      title: form.title || `${WIDGET_TYPES.find((t) => t.key === form.type)?.label ?? "Widget"}`,
      metrics: needsMetrics ? form.metrics : [],
    });
    setForm(DEFAULT_FORM);
    setLoading(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form onSubmit={handleSubmit} className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
        <h2 className="mb-4 text-xl font-semibold">Add Widget</h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-muted">Widget title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Weekly Distance"
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-muted">Visualization type</label>
            <div className="grid grid-cols-2 gap-2">
              {WIDGET_TYPES.map((type) => (
                <button
                  key={type.key}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      type: type.key as WidgetType,
                      metrics: type.key === "heatmap" || type.key === "table" ? [] : f.metrics,
                      width: type.key === "heatmap" || type.key === "table" ? 2 : f.width,
                    }))
                  }
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                    form.type === type.key
                      ? "border-accent bg-accent/10"
                      : "border-card-border hover:border-muted"
                  }`}
                >
                  <p className="font-medium">{type.label}</p>
                  <p className="mt-1 text-xs text-muted">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          {needsMetrics && (
            <div>
              <label className="mb-2 block text-sm text-muted">
                Metrics {allowsMultipleMetrics ? "(select one or more)" : ""}
              </label>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-card-border p-2">
                {METRICS.map((metric) => (
                  <label
                    key={metric.key}
                    className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 hover:bg-white/5"
                  >
                    <input
                      type={allowsMultipleMetrics ? "checkbox" : "radio"}
                      name="metric"
                      checked={form.metrics.includes(metric.key)}
                      onChange={() => toggleMetric(metric.key)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium">{metric.label}</p>
                      <p className="text-xs text-muted">
                        {metric.description} · {metric.unit}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {needsMetrics && (
            <div>
              <label className="mb-1 block text-sm text-muted">Aggregation</label>
              <select
                value={form.aggregation}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    aggregation: e.target.value as WidgetFormData["aggregation"],
                  }))
                }
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
              >
                <option value="sum">Sum</option>
                <option value="avg">Average</option>
                <option value="max">Maximum</option>
                <option value="min">Minimum</option>
                <option value="count">Count</option>
              </select>
            </div>
          )}

          {needsGroupBy && (
            <div>
              <label className="mb-1 block text-sm text-muted">Group by</label>
              <select
                value={form.groupBy}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    groupBy: e.target.value as WidgetFormData["groupBy"],
                  }))
                }
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="activity_type">Activity type</option>
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm text-muted">Activity filter (optional)</label>
            <select
              value={form.activityFilter ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  activityFilter: e.target.value || null,
                }))
              }
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
            >
              <option value="">All activities</option>
              {ACTIVITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {form.type !== "heatmap" && (
            <div>
              <label className="mb-1 block text-sm text-muted">Widget width</label>
              <select
                value={form.width}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    width: parseInt(e.target.value, 10) as 1 | 2,
                  }))
                }
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
              >
                <option value={1}>Half width</option>
                <option value={2}>Full width</option>
              </select>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? "Adding…" : "Add Widget"}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
