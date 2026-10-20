import { afterEach, expect, it, vi } from "vitest";
import { MatchReadClient } from "../lib/match-profiles";
import { resetArenaRequestsForTests } from "../lib/arena-requests";
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); resetArenaRequestsForTests(); });
it("paces reads across clients and waits for Retry-After before retrying", async () => {
  vi.useFakeTimers();
  const times: number[] = [];
  const fetcher = vi.fn(async () => {
    times.push(Date.now());
    if (times.length === 1) return new Response("{}", { status: 429, headers: { "Retry-After": "5" } });
    return new Response(JSON.stringify({ id: times.length }), { headers: { "Cache-Control": "no-store" } });
  });
  vi.stubGlobal("fetch", fetcher);
  const first = new MatchReadClient().request("/blocks/123");
  const second = new MatchReadClient().request("/blocks/456");
  await vi.runAllTimersAsync();
  await expect(first).resolves.toEqual({ id: 2 });
  await expect(second).resolves.toEqual({ id: 3 });
  expect(times[1] - times[0]).toBeGreaterThanOrEqual(5000);
  expect(times[2] - times[1]).toBeGreaterThanOrEqual(1100);
});

it("returns cached reads immediately without waiting behind the paced queue", async () => {
  const { ArenaClient } = await import("../lib/arena");
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ id: 789 }), { headers: { "Cache-Control": "public, max-age=60" } }));
  vi.stubGlobal("fetch", fetcher);
  await new ArenaClient().request("/blocks/789");
  vi.useFakeTimers();
  let finished = false;
  const cached = new MatchReadClient().request("/blocks/789").then(value => { finished = true; return value; });
  await Promise.resolve();
  expect(finished).toBe(true);
  await expect(cached).resolves.toEqual({ id: 789 });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
