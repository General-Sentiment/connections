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

it("discovers and reuses a conversation owned by the other participant", async () => {
  const { discoverConversations, findConversation } = await import("../lib/conversations");
  const sender = { id: 101, type: "User" as const, name: "Sender", slug: "sender" };
  const recipient = { id: 102, type: "User" as const, name: "Recipient", slug: "recipient" };
  const shared = { id: 500, type: "Channel", title: "Connection: Sender & Recipient", visibility: "private", owner: sender, collaborators: [recipient], can: { add_to: true }, updated_at: "2026-09-10" };
  const unrelated = { ...shared, id: 501, collaborators: [{ ...recipient, id: 103 }] };
  const publicChannel = { ...shared, id: 502, visibility: "public" };
  vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
    expect(options.headers).toMatchObject({ Authorization: "Bearer recipient-token" });
    const request = new URL(url);
    if (request.pathname === "/v3/search") {
      expect(request.searchParams.get("scope")).toBe("all");
      expect(request.searchParams.get("query")).toBe('"Connection:" "Recipient"');
      return new Response(JSON.stringify({ data: [unrelated, publicChannel, shared], meta: { next_page: null } }));
    }
    return new Response(JSON.stringify(request.pathname.endsWith("/501") ? unrelated : shared));
  }));
  const client = new ArenaClient("recipient-token");
  expect((await discoverConversations(client, recipient)).channels.map(x => x.id)).toEqual([500]);
  expect((await findConversation(client, recipient, sender.id))?.id).toBe(500);
});

it("counts actual conversations across search pages, including empty and duplicate pages", async () => {
  const { allConversations } = await import("../lib/conversations");
  const person = { id: 102, type: "User" as const, name: "Recipient", slug: "recipient" };
  const channel = { id: 500, type: "Channel", title: "Connection: Sender & Recipient", visibility: "private", owner: { ...person, id: 101 }, collaborators: [person], can: { add_to: true } };
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const request = new URL(url);
    if (request.pathname === "/v3/search") {
      const page = Number(request.searchParams.get("page"));
      return new Response(JSON.stringify({ data: page === 2 ? [{ ...channel, visibility: "public" }] : [channel], meta: { next_page: page < 3 ? page + 1 : null } }));
    }
    return new Response(JSON.stringify(channel));
  }));
  expect((await allConversations(new ArenaClient("token"), person)).map(x => x.id)).toEqual([500]);
});

it("avoids exhausting global search pages for one shared conversation", async () => {
  const { allConversations } = await import("../lib/conversations");
  const person = { id: 3248, type: "User" as const, name: "Jon-Kyle Mohr", slug: "jon-kyle" };
  const channel = { id: 5704077, type: "Channel", title: "Connection: JK Testing & Jon-Kyle Mohr", visibility: "private", owner: { ...person, id: 1646078 }, collaborators: [person], can: { add_to: true } };
  const fetcher = vi.fn(async (url: string) => {
    const request = new URL(url);
    if (request.pathname === "/v3/search") {
      const scoped = request.searchParams.get("query") === '"Connection:" "Jon-Kyle Mohr"';
      const page = Number(request.searchParams.get("page"));
      return new Response(JSON.stringify({ data: scoped ? [channel] : [], meta: { next_page: scoped ? null : page + 1 } }));
    }
    return new Response(JSON.stringify(channel));
  });
  vi.stubGlobal("fetch", fetcher);
  expect((await allConversations(new ArenaClient("recipient-token"), person)).map(x => x.id)).toEqual([5704077]);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
