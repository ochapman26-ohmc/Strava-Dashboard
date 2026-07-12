"use client";

import { useState } from "react";
import type { Goal } from "@/lib/db/schema";

interface GoalCardProps {
  goal: Goal;
  onDelete: (id: number) => void;
}

export function GoalCard({ goal, onDelete }: GoalCardProps) {
  const progress = goal.targetValue > 0
    ? Math.min(100, Math.round(((goal.currentValue ?? 0) / goal.targetValue) * 100))
    : 0;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold">{goal.title}</h3>
          {goal.description && (
            <p className="text-sm text-muted mt-1">{goal.description}</p>
          )}
        </div>
        <button
          onClick={() => onDelete(goal.id)}
          className="text-muted hover:text-red-400 text-sm transition-colors"
        >
          Remove
        </button>
      </div>

      <div className="flex items-center justify-between text-sm mb-2">
        <span>
          {goal.currentValue?.toFixed(1) ?? 0} / {goal.targetValue} {goal.unit}
        </span>
        <span className="text-muted">{progress}%</span>
      </div>

      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      {goal.deadline && (
        <p className="text-xs text-muted mt-2">Deadline: {goal.deadline}</p>
      )}
    </div>
  );
}

interface AddGoalFormProps {
  onAdd: () => void;
}

export function AddGoalForm({ onAdd }: AddGoalFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        targetType: form.get("targetType"),
        targetValue: form.get("targetValue"),
        unit: form.get("unit"),
        deadline: form.get("deadline") || null,
      }),
    });

    if (res.ok) {
      setOpen(false);
      onAdd();
      (e.target as HTMLFormElement).reset();
    }
    setLoading(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full">
        + Add Goal
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4">
      <h3 className="font-semibold">New Goal</h3>

      <input
        name="title"
        required
        placeholder="Goal title (e.g. Run 30km this week)"
        className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
      />

      <textarea
        name="description"
        placeholder="Description (optional)"
        rows={2}
        className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent resize-none"
      />

      <div className="grid grid-cols-2 gap-3">
        <select
          name="targetType"
          required
          className="bg-background border border-card-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
        >
          <option value="weekly_distance">Weekly Distance</option>
          <option value="monthly_activities">Monthly Activities</option>
          <option value="total_distance">Total Distance</option>
        </select>

        <input
          name="targetValue"
          type="number"
          required
          step="0.1"
          placeholder="Target value"
          className="bg-background border border-card-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <select
          name="unit"
          required
          className="bg-background border border-card-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
        >
          <option value="km">Kilometers</option>
          <option value="mi">Miles</option>
          <option value="activities">Activities</option>
        </select>

        <input
          name="deadline"
          type="date"
          className="bg-background border border-card-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
        />
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? "Creating..." : "Create Goal"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
