import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetArenaRequestsForTests } from "../lib/arena-requests";
import { ArenaClient } from "../lib/arena";
import { sendMessage, ensureConversation } from "../lib/conversations";
import { deleteProfile, saveProfile, assembleProfile, availableProfileRef } from "../lib/profiles";
import type { Item, Person } from "../lib/types";

const alice: Person = { id: 101, type: "User", name: "Alice", slug: "alice", tier: "premium" };
const bob: Person = { id: 102, type: "User", name: "Bob", slug: "bob" };
const base = { state: "available", visibility: "public", created_at: "2026-01-01", updated_at: "2026-01-01" };
let nextBlockId = 1000; let nextConnectionId = 5000;
let channel: Item; let contents: Item[]; let blocks: Map<number, Item>; let calls: { path: string; method: string; body: any }[]; let failAttachment: boolean;
beforeEach(() => {
  resetArenaRequestsForTests();
  channel = { ...base, id: 100, type: "Channel", title: "Connection: Alice & Bob", owner: alice, visibility: "private", collaborators: [bob], can: { add_to: true, update: true } };
  nextBlockId = 1000; nextConnectionId = 5000; contents = []; blocks = new Map([1, 2, 3].map(id => [id, { ...base, id, type: "Image", title: `Image ${id}`, user: alice } as Item])); calls = []; failAttachment = false;
  vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit = {}) => {
    const path = new URL(url).pathname + new URL(url).search; const method = options.method || "GET"; const body = options.body ? JSON.parse(String(options.body)) : undefined; calls.push({ path, method, body });
    const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
    if (path.startsWith("/v3/search")) return response({ data: channel.metadata?.role === "conversation" ? [channel] : [], meta: { next_page: null } });
    if (path === "/v3/channels" && method === "POST") { channel = { ...channel, title: body.title, visibility: body.visibility, owner: body.owner?.type === "Group" ? { type: "Group", id: body.owner.id, name: "Group", slug: "group" } : alice, collaborators: [], metadata: body.metadata }; return response(channel, 201); }
    if (path === "/v2/channels/100/collaborators") { channel.collaborators = [bob]; return response({ users: [bob] }); }
    if (path === "/v3/channels/100") { if (method === "PUT") channel = { ...channel, ...body, metadata: { ...channel.metadata, ...body.metadata } }; return response(channel); }
    if (path === "/v3/channels/999") return response({ ...channel, id: 999, visibility: "closed", can: { add_to: true } });
    if (path.startsWith("/v3/groups/77")) return response({ can: { manage_members: true }, data: channel.metadata?.profile_user_id ? [channel] : [], meta: { next_page: null } });
    if (path.startsWith("/v3/channels/100/contents")) return response({ data: contents, meta: { next_page: null, has_more_pages: false } });
    if (path.startsWith("/v3/channels/100/connections")) return response({ data: [], meta: { next_page: null } });
    if (path === "/v3/blocks" && method === "POST") {
      const id = nextBlockId++; const item: Item = { ...base, id, type: body.value.startsWith("https://") ? "Link" : "Text", title: body.title, user: alice, content: { plain: body.value, markdown: body.value }, metadata: body.metadata, connection: { id, position: contents.length + 1, connected_at: new Date().toISOString(), connected_by: alice, metadata: body.channels[0].metadata } }; contents.push(item); blocks.set(id, item); return response(item, 201);
    }
    if (path.startsWith("/v3/blocks/")) { const id = Number(path.split("/")[3]); const block = blocks.get(id); if (method === "PUT" && block) { block.title = body.title; if (body.content) block.content = { markdown: body.content, plain: body.content }; } return response(block); }
    if (path === "/v3/connections" && method === "POST") {
      if (failAttachment && body.channels[0].metadata.role === "attachment") { failAttachment = false; return response({}, 500); }
      if (body.channels[0].id === 100) { const block = blocks.get(body.connectable_id)!; contents.push({ ...block, connection: { id: nextConnectionId++, position: contents.length + 1, connected_at: new Date().toISOString(), connected_by: alice, metadata: body.channels[0].metadata } }); }
      return response({ data: [{ id: 5000 }] }, 201);
    }
    if (path.startsWith("/v3/connections/")) {
      const index = contents.findIndex(x => x.connection?.id === Number(path.split("/")[3]));
      if (index >= 0 && method === "DELETE") contents.splice(index, 1);
      if (index >= 0 && method === "POST" && path.endsWith("/move") && body.movement === "move_to_top") { const [item] = contents.splice(index, 1); contents.push(item); }
      contents.forEach((item, i) => { item.connection!.position = i + 1; });
      return response({});
    }
    throw new Error(`Unexpected request: ${method} ${path}`);
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("message persistence", () => {
  it("resumes a partial write without duplicating its text, and handles repeated submission", async () => {
    const client = new ArenaClient("test-token"); const input = { requestId: "00000000-0000-4000-8000-000000000003", text: "Hello", attachments: [{ id: 1, type: "Block" }] };
    failAttachment = true; await expect(sendMessage(client, alice, 100, input)).rejects.toThrow();
    expect(contents.filter(x => x.type === "Text")).toHaveLength(1);
    resetArenaRequestsForTests(); // Simulate a new worker: only Are.na contains the earlier write.
    await sendMessage(client, alice, 100, input); await sendMessage(client, alice, 100, input);
    expect(contents.filter(x => x.type === "Text")).toHaveLength(1); expect(contents.filter(x => x.type === "Image")).toHaveLength(1);
  });
  it("checks access before saving anything", async () => {
    channel.collaborators!.push({ ...bob, id: 103 }); await expect(sendMessage(new ArenaClient("token"), alice, 100, { requestId: "00000000-0000-4000-8000-000000000004", text: "Hello", attachments: [] })).rejects.toThrow(); expect(contents).toHaveLength(0);
  });
  it("creates an individually owned private channel, then verifies the collaborator before messages", async () => {
    const result = await ensureConversation(new ArenaClient("token"), "token", alice, bob);
    expect(result.owner?.type).toBe("User"); expect(result.visibility).toBe("private");
    expect(calls.find(x => x.path === "/v3/channels" && x.method === "POST")?.body.owner).toBeUndefined();
    expect(calls.find(x => x.path.startsWith("/v2/"))?.body).toEqual({ ids: [102] }); expect(contents).toHaveLength(0);
  });
});
describe("profile writes", () => {
  it("stores biography, description, details and three real connections, and reuses them on edit", async () => {
    vi.stubEnv("ARENA_GROUP_ID", "77"); vi.stubEnv("ARENA_PROFILES_CHANNEL", "999");
    const input = { whoAreYou: "An artist in Paris.", lookingFor: "Conversation", details: { schema: "connections_profile", version: 1, location: { city: "Paris", country: "France" }, open_to: ["conversation"], local_only: false }, selected: [1, 2, 3].map(id => ({ id, type: "Block" })) };
    await saveProfile(alice, "token", input); await saveProfile(alice, "token", { ...input, lookingFor: "Creative partnership" });
    expect(contents).toHaveLength(6);
    expect(channel.owner?.type).toBe("Group");
    expect(channel.owner?.id).toBe(77);
    expect(calls.some(x => x.path === "/v3/connections" && x.body?.channels?.some((channel: { id: number }) => channel.id === 999))).toBe(false);
    expect(contents.find(x => x.title === "details")?.content?.markdown).toContain("```yaml");
    expect(contents.some(x => x.metadata?.role === "profile_link")).toBe(false);
    expect(calls.some(x => x.method === "PUT" && x.body?.description === "https://www.are.na/alice")).toBe(true);
    expect(contents.filter(x => x.connection?.metadata?.role === "selected").map(x => x.id).sort()).toEqual([1, 2, 3]);
    expect(calls.filter(x => x.path === "/v3/blocks" && x.body?.metadata?.role === "selected")).toHaveLength(0);
    expect(calls.filter(x => x.path === "/v3/channels" && x.method === "POST")).toHaveLength(1);
  });
  it("keeps description blocks adjacent through edits, reordering and removal", async () => {
    vi.stubEnv("ARENA_GROUP_ID", "77"); vi.stubEnv("ARENA_PROFILES_CHANNEL", "999");
    const input = { whoAreYou: "Artist", lookingFor: "Conversation", details: { schema: "connections_profile", version: 1, location: { city: "Paris", country: "France" }, open_to: ["conversation"], local_only: false }, selected: [1, 2, 3].map(id => ({ id, type: "Block", description: `Why ${id} matters` })) };
    await saveProfile(alice, "token", input);
    const descriptions = contents.filter(x => x.metadata?.role === "selected_description");
    expect(descriptions).toHaveLength(3);
    const ids = descriptions.map(x => x.id);
    input.selected.reverse(); input.selected[0].description = "Changed perspective";
    await saveProfile(alice, "token", input);
    expect(contents.filter(x => x.metadata?.role === "selected_description").map(x => x.id).sort()).toEqual(ids.sort());
    expect([...contents].reverse().slice(3).map(x => x.title)).toEqual(["Image 3", "Image 3", "Image 2", "Image 2", "Image 1", "Image 1"]);
    const profile = assembleProfile(channel, contents, alice);
    expect(profile.selected.map(x => x.id)).toEqual([3, 2, 1]);
    expect(profile.selectedDescriptions?.["Block:3"]).toBe("Changed perspective");
    input.selected[1].description = "";
    await saveProfile(alice, "token", input);
    expect(contents.filter(x => x.metadata?.role === "selected_description")).toHaveLength(2);
    expect(blocks.has(ids[1])).toBe(true); // Disconnecting does not delete the source block.
  });
  it("rejects selections created by someone else before creating a profile", async () => {
    vi.stubEnv("ARENA_GROUP_ID", "77"); vi.stubEnv("ARENA_PROFILES_CHANNEL", "999"); blocks.get(2)!.user = bob;
    await expect(saveProfile(alice, "token", { whoAreYou: "An artist in Paris.", lookingFor: "Hello", details: { schema: "connections_profile", version: 1, location: { city: "Paris", country: "France" }, open_to: ["conversation"], local_only: false }, selected: [1, 2, 3].map(id => ({ id, type: "Block" })) })).rejects.toThrow("created by your account");
    expect(calls.some(x => x.path === "/v3/channels" && x.method === "POST")).toBe(false);
  });
});

describe("retry recovery without local records", () => {
  it("resumes a conversation whose collaborator write failed without creating another channel", async () => {
    const originalFetch = globalThis.fetch;
    let fail = true;
    vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
      if (url.includes("/v2/") && fail) { fail = false; return new Response("{}", { status: 500 }); }
      return originalFetch(url, options);
    }));
    await expect(ensureConversation(new ArenaClient("token"), "token", alice, bob)).rejects.toThrow();
    resetArenaRequestsForTests();
    await ensureConversation(new ArenaClient("token"), "token", alice, bob);
    expect(calls.filter(call => call.path === "/v3/channels" && call.method === "POST")).toHaveLength(1);
  });
  it("rejects changed payloads using the hash stored with an existing message", async () => {
    const input = { requestId: "00000000-0000-4000-8000-000000000098", text: "Original", attachments: [] };
    await sendMessage(new ArenaClient("token"), alice, 100, input);
    resetArenaRequestsForTests();
    await expect(sendMessage(new ArenaClient("token"), alice, 100, { ...input, text: "Changed" })).rejects.toThrow("changed during a retry");
    expect(contents.filter(item => item.type === "Text")).toHaveLength(1);
  });
});

describe("Are.na profile discovery", () => {
  it("finds an unpublished profile from metadata after a worker restart", async () => {
    vi.stubEnv("ARENA_GROUP_ID", "77");
    channel = { ...channel, owner: { type: "Group", id: 77, name: "Connections", slug: "connections" }, metadata: { app: "connections", profile_user_id: alice.id, published: false } };
    resetArenaRequestsForTests();
    expect(await availableProfileRef(alice.id, new ArenaClient("token"))).toMatchObject({ channel_id: 100, published: 0 });
  });
  it("does not treat API failure as permission to create another profile", async () => {
    vi.stubEnv("ARENA_GROUP_ID", "77");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    await expect(availableProfileRef(alice.id, new ArenaClient("token"))).rejects.toMatchObject({ status: 500 });
  });
});

describe("profile deletion", () => {
  beforeEach(() => {
    vi.stubEnv("ARENA_GROUP_ID", "77");
    channel = { ...channel, owner: { type: "Group", id: 77, name: "Connections", slug: "connections" }, metadata: { app: "connections", profile_user_id: alice.id } };
  });
  it("deletes only the current user's profile channel", async () => {
    await expect(deleteProfile(alice, "token", 100)).resolves.toEqual({ deleted: true });
    expect(calls.filter(call => call.method === "DELETE").map(call => call.path)).toEqual(["/v3/channels/100"]);
  });
  it("rejects another user's profile", async () => {
    await expect(deleteProfile(bob, "token", 100)).rejects.toThrow("your own profile");
    expect(calls.some(call => call.method === "DELETE")).toBe(false);
  });
  it("rejects channels outside the directory group", async () => {
    channel.owner = alice;
    await expect(deleteProfile(alice, "token", 100)).rejects.toThrow("your own profile");
    expect(calls.some(call => call.method === "DELETE")).toBe(false);
  });
});
