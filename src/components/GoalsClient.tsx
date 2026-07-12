"use client";

import { useEffect, useState } from "react";
import { GoalCard, AddGoalForm } from "@/components/GoalCard";
import type { Goal } from "@/lib/db/schema";

export function GoalsClient() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadGoals() {
    const res = await fetch("/api/goals");
    if (res.ok) {
      const data = await res.json();
      setGoals(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadGoals();
  }, []);

  async function handleDelete(id: number) {
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  return (
    <div className="space-y-4">
      <AddGoalForm onAdd={loadGoals} />

      {loading ? (
        <div className="text-center text-muted py-8">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          No goals yet. Create one above to start tracking your progress.
        </div>
      ) : (
        goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} onDelete={handleDelete} />
        ))
      )}
    </div>
  );
}
