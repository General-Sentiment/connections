import { afterEach, expect, it, vi } from "vitest";
import { ArenaClient } from "../lib/arena";
import { allItems } from "../lib/arena-discovery";
import { resetArenaRequestsForTests } from "../lib/arena-requests";
afterEach(() => { vi.unstubAllGlobals(); resetArenaRequestsForTests(); });
it("checks later pages before deciding a retry has no existing item", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const page = Number(new URL(url).searchParams.get("page"));
    return new Response(JSON.stringify({ data: [{ id: page }], meta: { next_page: page === 1 ? 2 : null } }));
  }));
  expect((await allItems(new ArenaClient("token"), "/channels/1/contents?sort=position_desc")).map(x => x.id)).toEqual([1, 2]);
});
it("fails closed when discovery returns broken pagination", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ data: [], meta: { next_page: 1 } }))));
  await expect(allItems(new ArenaClient("token"), "/channels/1/contents")).rejects.toThrow("incomplete pagination");
});
