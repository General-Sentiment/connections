import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ArenaClient } from "../lib/arena";
import { resetArenaRequestsForTests } from "../lib/arena-requests";
const json = (data: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(data), { headers: { "Cache-Control": "public, max-age=300", ...headers } });
beforeEach(resetArenaRequestsForTests);
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it("combines duplicate public reads and caches independent copies", async () => {
  const fetcher = vi.fn(async () => json({ title: "Original" })); vi.stubGlobal("fetch", fetcher);
  const client = new ArenaClient();
  const [a, b] = await Promise.all([client.item("Block", 1), client.item("Block", 1)]);
  a.title = "Changed locally";
  expect(b.title).toBe("Original"); expect((await client.item("Block", 1)).title).toBe("Original"); expect(fetcher).toHaveBeenCalledTimes(1);
});
it("never reuses private responses or shares them between accounts", async () => {
  const fetcher = vi.fn(async (_url, options) => json({ account: options.headers.Authorization })); vi.stubGlobal("fetch", fetcher);
  const alice = new ArenaClient("alice"); const bob = new ArenaClient("bob");
  expect(await alice.request("/me")).toEqual({ account: "Bearer alice" });
  expect(await bob.request("/me")).toEqual({ account: "Bearer bob" });
  await alice.request("/me"); expect(fetcher).toHaveBeenCalledTimes(3);
});
it("honors retry timing without retrying requests during cooldown", async () => {
  let now = 100000; vi.spyOn(Date, "now").mockImplementation(() => now);
  const fetcher = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 429, headers: { "Retry-After": "10" } })).mockImplementation(async () => json({ id: 1 })); vi.stubGlobal("fetch", fetcher);
  const client = new ArenaClient();
  await expect(client.item("Block", 1)).rejects.toMatchObject({ status: 429, retryAfter: "10" });
  await expect(client.item("Block", 2)).rejects.toMatchObject({ status: 429 }); expect(fetcher).toHaveBeenCalledTimes(1);
  now += 10001; await client.item("Block", 2); expect(fetcher).toHaveBeenCalledTimes(2);
});
it("expires cached data and honors no-store", async () => {
  let now = 100000; vi.spyOn(Date, "now").mockImplementation(() => now);
  const fetcher = vi.fn(async () => json({ id: 1 }, { "Cache-Control": "max-age=2, public" })); vi.stubGlobal("fetch", fetcher);
  const client = new ArenaClient(); await client.item("Block", 1); now += 2001; await client.item("Block", 1); expect(fetcher).toHaveBeenCalledTimes(2);
  fetcher.mockImplementation(async () => json({ id: 2 }, { "Cache-Control": "no-store" }));
  await client.item("Block", 2); await client.item("Block", 2); expect(fetcher).toHaveBeenCalledTimes(4);
});
it("invalidates public reads after a successful write", async () => {
  const fetcher = vi.fn(async () => json({ id: 1 })); vi.stubGlobal("fetch", fetcher);
  await new ArenaClient().item("Block", 1); await new ArenaClient("author").updateBlock(1, { title: "New" }); await new ArenaClient().item("Block", 1);
  expect(fetcher).toHaveBeenCalledTimes(3);
});
it("bypasses public cache when verifying publication permissions", async () => {
  const fetcher = vi.fn(async () => json({ id: 1 })); vi.stubGlobal("fetch", fetcher);
  await new ArenaClient().item("Block", 1);
  fetcher.mockImplementation(async () => new Response("{}", { status: 404 }));
  await expect(new ArenaClient(undefined, false).item("Block", 1)).rejects.toMatchObject({ status: 404 }); expect(fetcher).toHaveBeenCalledTimes(2);
});
