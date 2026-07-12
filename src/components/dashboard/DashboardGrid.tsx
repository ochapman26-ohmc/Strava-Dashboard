"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Ref } from "react";
import dynamic from "next/dynamic";
import type { Layout } from "react-grid-layout/legacy";
import type { Activity } from "@/lib/db/schema";
import type { DashboardWidget, TimeRange } from "@/lib/dashboard/types";
import { layoutToWidgetUpdates, widgetsToLayout } from "@/lib/dashboard/layout";
import { WidgetRenderer } from "./WidgetRenderer";
import "react-grid-layout/css/styles.css";

const ReactGridLayout = dynamic(
  () =>
    import("react-grid-layout/legacy").then((mod) =>
      mod.WidthProvider(mod.ReactGridLayout)
    ),
  { ssr: false }
);

interface DashboardGridProps {
  widgets: DashboardWidget[];
  activities: Activity[];
  timeRange: TimeRange;
  editMode: boolean;
  onLayoutSaved: (widgets: DashboardWidget[]) => void;
  onDeleteWidget: (id: number) => void;
}

function renderResizeHandle(axis: string, ref: Ref<HTMLElement>) {
  return (
    <span
      ref={ref}
      className={`widget-resize-handle react-resizable-handle react-resizable-handle-${axis}`}
      aria-hidden="true"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
        <path d="M13 13L7 13L13 7Z" opacity="0.4" />
        <path d="M13 13L9 13L13 9Z" opacity="0.7" />
      </svg>
    </span>
  );
}

export function DashboardGrid({
  widgets,
  activities,
  timeRange,
  editMode,
  onLayoutSaved,
  onDeleteWidget,
}: DashboardGridProps) {
  const [layout, setLayout] = useState<Layout>([]);
  const [mounted, setMounted] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLayout(widgetsToLayout(widgets));
  }, [widgets]);

  const saveLayout = useCallback(
    (newLayout: Layout) => {
      const updates = layoutToWidgetUpdates(newLayout);
      if (saveTimer.current) clearTimeout(saveTimer.current);

      saveTimer.current = setTimeout(async () => {
        await fetch("/api/dashboard/layout", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ layouts: updates }),
        });

        onLayoutSaved(
          widgets.map((w) => {
            const update = updates.find((u) => u.id === w.id);
            if (!update) return w;
            return {
              ...w,
              gridX: update.gridX,
              gridY: update.gridY,
              gridW: update.gridW,
              gridH: update.gridH,
              width: update.width as 1 | 2,
              order: update.order,
            };
          })
        );
      }, 400);
    },
    [onLayoutSaved, widgets]
  );

  const commitLayout = useCallback(
    (newLayout: Layout) => {
      const snapped = newLayout.map((item) => ({
        ...item,
        w: item.w >= 1.5 ? 2 : 1,
        h: Math.max(2, Math.round(item.h)),
      }));
      setLayout(snapped);
      saveLayout(snapped);
    },
    [saveLayout]
  );

  const gridWidgets = useMemo(
    () => [...widgets].sort((a, b) => a.order - b.order),
    [widgets]
  );

  if (!mounted) {
    return <div className="py-20 text-center text-muted">Loading dashboard…</div>;
  }

  return (
    <ReactGridLayout
      className={`dashboard-grid ${editMode ? "edit-mode" : ""}`}
      layout={layout}
      cols={2}
      rowHeight={80}
      margin={[16, 16] as [number, number]}
      containerPadding={[0, 0] as [number, number]}
      isDraggable={editMode}
      isResizable={editMode}
      draggableHandle=".widget-drag-handle"
      resizeHandles={["se"]}
      resizeHandle={renderResizeHandle}
      onLayoutChange={setLayout}
      onDragStop={commitLayout}
      onResizeStop={commitLayout}
      compactType="vertical"
      preventCollision={false}
    >
      {gridWidgets.map((widget) => (
        <div
          key={String(widget.id)}
          className={`card relative flex h-full flex-col overflow-hidden ${
            editMode ? "ring-1 ring-accent/20" : ""
          }`}
        >
          <div
            className={`flex shrink-0 items-center justify-between border-b border-card-border px-4 py-3 ${
              editMode ? "widget-drag-handle cursor-grab active:cursor-grabbing" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              {editMode && (
                <span className="text-muted" title="Drag to move">
                  ⠿
                </span>
              )}
              <h3 className="font-semibold">{widget.title}</h3>
            </div>
            {editMode && (
              <button
                onClick={() => onDeleteWidget(widget.id)}
                className="text-xs text-muted transition-colors hover:text-red-400"
              >
                Remove
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-hidden p-4">
            <WidgetRenderer
              widget={widget}
              activities={activities}
              timeRange={timeRange}
            />
          </div>
        </div>
      ))}
    </ReactGridLayout>
  );
}
