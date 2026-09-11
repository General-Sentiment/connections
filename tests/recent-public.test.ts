import { afterEach, expect, it, vi } from "vitest";
import { recentPublic } from "../lib/profiles";
import { resetArenaRequestsForTests } from "../lib/arena-requests";

const item = (id: number, type: "Image" | "Channel" = "Image") => ({
  id, type, title: `Item ${id}`, state: "available", visibility: "public",
  created_at: "2020-01-01T00:00:00Z", updated_at: `2026-09-10T12:00:${String(id).padStart(2, "0")}Z`,
  user: { id: 101, type: "User" }, owner: { id: 101, type: "User" },
});
const response = (data: unknown[], next_page: number | null = null) => new Response(JSON.stringify({ data, meta: { next_page } }), { headers: { "Cache-Control": "public, max-age=300" } });
afterEach(() => { vi.unstubAllGlobals(); resetArenaRequestsForTests(); });

it.each(["Block", "Channel"] as const)("sorts an unordered %s page before choosing four recent items", async type => {
  const fetcher = vi.fn(async (url: string) => {
    expect(new URL(url).searchParams.get("sort")).toBe("updated_at_desc");
    const kind = type === "Block" ? "Image" : "Channel";
    return response([1, 2, 3, 4, 5, 6].map(id => item(id, kind)));
  });
  vi.stubGlobal("fetch", fetcher);
  expect((await recentPublic(101, type)).map(x => x.id)).toEqual([6, 5, 4, 3]);
});

it("continues past excluded items and refreshes without the local public cache", async () => {
  const fetcher = vi.fn(async (url: string) => Number(new URL(url).searchParams.get("page")) === 1
    ? response([item(8), { ...item(9), metadata: { app: "connections" } }, { ...item(10), visibility: "private" }, { ...item(11), user: { id: 102 } }], 2)
    : response([item(1), item(2), item(3), item(4)]));
  vi.stubGlobal("fetch", fetcher);
  expect((await recentPublic(101, "Block")).map(x => x.id)).toEqual([8, 4, 3, 2]);
  await recentPublic(101, "Block");
  expect(fetcher).toHaveBeenCalledTimes(4);
});
