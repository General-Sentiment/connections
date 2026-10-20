import { afterEach, expect, it, vi } from "vitest";
import { fetchMatchProfiles } from "../lib/fetch-match-profiles";
afterEach(() => vi.unstubAllGlobals());
function streaming(events: string[]) {
  return new Response(new ReadableStream({ start(controller) {
    for (const event of events) controller.enqueue(new TextEncoder().encode(event));
    controller.close();
  } }), { headers: { "Content-Type": "application/x-ndjson" } });
}
it("reports streamed progress and resolves after complete, including split events", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => streaming(['{"status":"loading","loaded":1,"total":2}\n{"status":"com', 'plete","profiles":[],"skipped":1}\n'])));
  const progress = vi.fn();
  await expect(fetchMatchProfiles(progress)).resolves.toEqual({ profiles: [], skipped: 1 });
  expect(progress).toHaveBeenCalledWith("Loading preferences: 1 of 2 profiles checked…");
});
it("rejects interrupted streams rather than leaving matching pending", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => streaming(['{"status":"loading"}\n'])));
  await expect(fetchMatchProfiles(vi.fn())).rejects.toThrow("ended before loading finished");
});
it("surfaces server failures", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => streaming(['{"status":"error","error":"Try again later"}\n'])));
  await expect(fetchMatchProfiles(vi.fn())).rejects.toThrow("Try again later");
});
