import { expect, it } from "vitest";
import { relativeTime } from "../lib/relative-time";
const now = Date.parse("2026-09-11T12:00:00Z");
it.each([[0, "Just now"], [59, "Just now"], [60, "1 minute ago"], [120, "2 minutes ago"], [3600, "1 hour ago"], [86400, "1 day ago"], [432000, "5 days ago"]])("formats elapsed %s seconds", (seconds, expected) => {
  expect(relativeTime(new Date(now - Number(seconds) * 1000).toISOString(), now)).toBe(expected);
});
it("handles clock skew and invalid dates", () => {
  expect(relativeTime(new Date(now + 10000).toISOString(), now)).toBe("Just now");
  expect(relativeTime("invalid", now)).toBe("Unknown time");
});
it("switches from relative time to a date at 30 days", () => {
  expect(relativeTime(new Date(now - 29 * 86400000).toISOString(), now)).toBe("29 days ago");
  expect(relativeTime(new Date(now - 30 * 86400000).toISOString(), now)).toBe("Aug 12, 2026");
  expect(relativeTime("2025-01-02T18:30:00Z", now)).toBe("Jan 2, 2025");
});
