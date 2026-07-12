import type { DashboardWidget } from "@/lib/db/schema";

type LayoutItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  maxW?: number;
  minH?: number;
};

export function defaultWidgetHeight(type: string): number {
  switch (type) {
    case "stat":
      return 2;
    case "heatmap":
      return 4;
    case "table":
      return 3;
    default:
      return 3;
  }
}

export function widgetsToLayout(widgets: DashboardWidget[]) {
  return [...widgets]
    .sort((a, b) => a.order - b.order)
    .map((widget) => ({
      i: String(widget.id),
      x: widget.gridX ?? 0,
      y: widget.gridY ?? 0,
      w: (widget.gridW || widget.width) === 2 ? 2 : 1,
      h: widget.gridH || defaultWidgetHeight(widget.type),
      minW: 1,
      maxW: 2,
      minH: 2,
    }));
}

export function layoutToWidgetUpdates(
  layout: readonly LayoutItem[]
) {
  return layout
    .map((item, index) => ({
      id: parseInt(item.i, 10),
      gridX: item.x,
      gridY: item.y,
      gridW: item.w >= 2 ? 2 : 1,
      gridH: Math.max(2, item.h),
      width: item.w >= 2 ? 2 : 1,
      order: index,
    }))
    .filter((item) => !Number.isNaN(item.id));
}
