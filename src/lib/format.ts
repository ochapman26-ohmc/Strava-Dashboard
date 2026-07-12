export function formatDistance(meters: number, unit: "km" | "mi" = "km") {
  const value = unit === "km" ? meters / 1000 : meters / 1609.34;
  return `${value.toFixed(1)} ${unit}`;
}

export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatPace(metersPerSecond: number, unit: "km" | "mi" = "km") {
  if (!metersPerSecond) return "—";
  const secondsPerUnit = unit === "km" ? 1000 / metersPerSecond : 1609.34 / metersPerSecond;
  const min = Math.floor(secondsPerUnit / 60);
  const sec = Math.floor(secondsPerUnit % 60);
  return `${min}:${sec.toString().padStart(2, "0")}/${unit}`;
}
