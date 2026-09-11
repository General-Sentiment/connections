export function relativeTime(sentAt: string, now: number) {
  const timestamp = Date.parse(sentAt);
  if (!Number.isFinite(timestamp)) return "Unknown time";
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds >= 30 * 86400) return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const units = [[86400, "day"], [3600, "hour"], [60, "minute"]] as const;
  for (const [size, unit] of units) {
    if (seconds >= size) {
      const count = Math.floor(seconds / size);
      return `${count} ${unit}${count === 1 ? "" : "s"} ago`;
    }
  }
  return "Just now";
}
