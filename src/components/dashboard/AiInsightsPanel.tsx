"use client";

import { useState } from "react";
import type { TimeRange } from "@/lib/dashboard/types";

interface AiInsightsPanelProps {
  timeRange: TimeRange;
}

export function AiInsightsPanel({ timeRange }: AiInsightsPanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState("");
  const [error, setError] = useState("");

  async function fetchInsights() {
    setOpen(true);
    setLoading(true);
    setError("");
    setInsight("");

    try {
      const res = await fetch("/api/dashboard/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeRange }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate insights");
      setInsight(data.insight);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate insights");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={fetchInsights} className="btn-primary text-sm">
        ✨ AI Insight
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <div className="flex h-full w-full max-w-lg flex-col border-l border-card-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-card-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">AI Dashboard Insight</h2>
                <p className="text-sm text-muted">
                  Expert coaching analysis of your dashboard & goals
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted transition-colors hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {loading ? (
                <div className="space-y-3">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-card-border" />
                  <div className="h-4 w-full animate-pulse rounded bg-card-border" />
                  <div className="h-4 w-5/6 animate-pulse rounded bg-card-border" />
                  <p className="pt-4 text-sm text-muted">Analyzing your dashboard…</p>
                </div>
              ) : error ? (
                <p className="text-sm text-red-400">{error}</p>
              ) : (
                <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                  {insight}
                </div>
              )}
            </div>

            <div className="border-t border-card-border px-6 py-4">
              <button
                onClick={fetchInsights}
                disabled={loading}
                className="btn-secondary w-full text-sm"
              >
                Refresh insight
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
