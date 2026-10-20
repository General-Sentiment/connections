import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ request: vi.fn(), item: vi.fn(), ref: vi.fn(), items: vi.fn(), tokens: [] as (string | undefined)[] }));
vi.mock("../lib/arena", async () => {
  const actual = await vi.importActual<typeof import("../lib/arena")>("../lib/arena");
  return { ...actual, ArenaClient: class { constructor(token?: string) { m.tokens.push(token); } request = m.request; item = m.item; } };
});
vi.mock("../lib/profiles", () => ({ availableProfileRef: m.ref }));
vi.mock("../lib/arena-discovery", () => ({ allItems: m.items }));
import { createProfileBlock, createProfileBlockSchema } from "../lib/create-profile-block";
const person = { id: 1, type: "User" as const, name: "A", slug: "a" };
const requestId = "848fce29-22e1-4edc-afc4-531f639e34c6";
beforeEach(() => {
  vi.clearAllMocks(); m.tokens.length = 0;
  m.ref.mockResolvedValue({ channel_id: 10, published: 1 });
  m.item.mockResolvedValue({ id: 10, metadata: { profile_user_id: 1 }, can: { add_to: true } });
  m.items.mockResolvedValue([]);
  m.request.mockResolvedValue({ id: 20, type: "Text", state: "available" });
});
it("creates a block with the user account directly in their profile channel", async () => {
  await createProfileBlock(person, "user-token", { value: "My new text", title: "", requestId });
  expect(m.tokens).toEqual(["user-token"]);
  expect(m.request).toHaveBeenCalledWith("/blocks", { method: "POST", body: { value: "My new text", title: "My new text", channels: [{ id: 10, metadata: { app: "connections", role: "selected", creation_id: requestId } }] } });
});
it("reuses an existing block after retry rather than creating it again", async () => {
  m.items.mockResolvedValue([{ id: 20, connection: { metadata: { creation_id: requestId } } }]);
  await expect(createProfileBlock(person, "user-token", { value: "My new text", title: "", requestId })).resolves.toMatchObject({ id: 20 });
  expect(m.request).not.toHaveBeenCalled();
});
it("rejects writing to another user's profile", async () => {
  m.item.mockResolvedValue({ id: 10, metadata: { profile_user_id: 2 }, can: { add_to: true } });
  await expect(createProfileBlock(person, "user-token", { value: "Text", title: "", requestId })).rejects.toMatchObject({ status: 403 });
  expect(m.request).not.toHaveBeenCalled();
});
it("requires exactly one content source", () => {
  expect(createProfileBlockSchema.safeParse({ requestId }).success).toBe(false);
  expect(createProfileBlockSchema.safeParse({ requestId, value: "text", uploadKey: "image" }).success).toBe(false);
});
