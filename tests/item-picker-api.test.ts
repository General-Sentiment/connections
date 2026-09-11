import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../app/api/items/route";
import { resetArenaRequestsForTests } from "../lib/arena-requests";
vi.mock("../lib/session", () => ({ requireSession: async () => ({ token: "test-token", person: { id: 101, tier: "premium" } }) }));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); resetArenaRequestsForTests(); });
it("browses channel contents including public collected blocks and nested channels", async () => {
  vi.stubEnv("DEMO_MODE", "false");
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    expect(new URL(url).pathname).toBe("/v3/channels/77/contents");
    return new Response(JSON.stringify({ data: [
      { id: 1, type: "Image", visibility: "public", state: "available", user: { id: 102 } },
      { id: 2, type: "Channel", visibility: "closed", state: "available" },
      { id: 3, type: "Image", visibility: "private", state: "available" },
      { id: 4, type: "Text", visibility: "public", state: "available", metadata: { app: "connections" } },
    ], meta: { next_page: 2 } }));
  }));
  const response = await GET(new NextRequest("http://localhost/api/items?channel=77&type=Channel"));
  const data = await response.json();
  expect(data.data.map((item: { id: number }) => item.id)).toEqual([1, 2]);
  expect(data.meta.next_page).toBe(2);
});

it.each([
  ["  https://www.are.na/block/42  ", "Channel", "/v3/blocks/42", "Image"],
  ["are.na/someone/a-channel", "Block", "/v3/channels/a-channel", "Channel"],
])("resolves pasted URL %s regardless of the active filter or channel", async (q, type, path, itemType) => {
  vi.stubEnv("DEMO_MODE", "false");
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    expect(new URL(url).pathname).toBe(path);
    return new Response(JSON.stringify({ id: 42, type: itemType, visibility: "public", state: "available" }));
  }));
  const params = new URLSearchParams({ q, type, channel: "77" });
  const response = await GET(new NextRequest(`http://localhost/api/items?${params}`));
  expect(response.status).toBe(200);
  expect((await response.json()).data).toEqual([expect.objectContaining({ id: 42, type: itemType })]);
});
