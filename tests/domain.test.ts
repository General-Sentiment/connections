import { describe, expect, it } from "vitest";
import { parseDetails, serializeDetails, profileInputSchema, type Details } from "../lib/details";
import { parseArenaUrl, safeUrl } from "../lib/urls";
import { assertParticipant, groupMessages, messageSchema, participants } from "../lib/conversations";
import { assembleProfile } from "../lib/profiles";
import type { Item, Person } from "../lib/types";

const alice: Person = { id: 1, type: "User", name: "Alice", slug: "alice" };
const bob: Person = { id: 2, type: "User", name: "Bob", slug: "bob" };
const details: Details = { schema: "connections_profile", version: 1, location: { city: "Mexico City", country: "Mexico" }, open_to: ["conversation", "romance"], local_only: false };
const channel: Item = { id: 100, type: "Channel", title: "Connection: Alice & Bob", visibility: "private", state: "available", owner: alice, collaborators: [bob], created_at: "2026-01-01", updated_at: "2026-01-01", can: { add_to: true } };
const textBlock = (id: number, sender: Person, message: string, role = "message"): Item => ({ id, type: "Text", title: "Reply", content: { markdown: "Hello", plain: "Hello" }, visibility: "private", state: "available", created_at: "2026-01-01", updated_at: "2026-01-01", user: sender, connection: { id, position: id, connected_at: `2026-01-01T00:00:${String(id).padStart(2, "0")}Z`, connected_by: sender, metadata: { role, message_id: message } } });

describe("details storage", () => {
  it("round-trips a fenced YAML block without duplicating account or showcase storage", () => { const value = serializeDetails(details); expect(value).toMatch(/^```yaml\n/); expect(parseDetails(value)).toEqual(details); expect(value).not.toMatch(/country_code|showcase|user_id/); });
  it("rejects unknown versions, duplicate keys, aliases and unwanted fields", () => {
    const encoded = serializeDetails(details);
    expect(() => parseDetails(encoded.replace("version: 1", "version: 2"))).toThrow();
    expect(() => parseDetails(encoded.replace("version: 1", "version: 1\nversion: 1"))).toThrow();
    expect(() => parseDetails(encoded.replace("version: 1", "version: 1\nshowcase: []"))).toThrow();
    expect(() => parseDetails("```yaml\na: &a [1]\nb: *a\n``` ")).toThrow();
    expect(() => parseDetails(encoded.repeat(2))).toThrow();
  });
  it("requires exactly three unique typed selections and at least one intention", () => {
    const input = { whoAreYou: "An artist in Paris.", lookingFor: "A conversation", details, selected: [{ id: 1, type: "Block" }, { id: 3, type: "Block" }, { id: 2, type: "Block" }] };
    expect(profileInputSchema.safeParse(input).success).toBe(true);
    expect(profileInputSchema.safeParse({ ...input, selected: [{ id: 1, type: "Channel" }, ...input.selected.slice(1)] }).success).toBe(true);
    expect(profileInputSchema.safeParse({ ...input, selected: input.selected.slice(1) }).success).toBe(false);
    expect(profileInputSchema.safeParse({ ...input, selected: [input.selected[0], input.selected[0], input.selected[2]] }).success).toBe(false);
    expect(profileInputSchema.safeParse({ ...input, details: { ...details, open_to: [] } }).success).toBe(false);
  });
});
describe("URL handling", () => {
  it("recognizes only actual Are.na block and channel URLs", () => {
    expect(parseArenaUrl("https://www.are.na/block/123")).toEqual({ type: "Block", id: "123" });
    expect(parseArenaUrl("https://are.na/alice/some-channel?view=grid")).toEqual({ type: "Channel", id: "some-channel" });
    for (const url of ["http://localhost:3000/a/b", "https://are.na.evil.test/a/b", "https://are.na@evil.test/a/b", "https://user:pass@are.na/a/b", "https://are.na:444/a/b", "https://are.na/alice", "https://are.na/developers/explore", "javascript:alert(1)"]) expect(() => parseArenaUrl(url)).toThrow();
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
  });
});
describe("private conversation access", () => {
  it("allows exactly the two named individual participants", () => { expect(participants(channel).map(x => x.id)).toEqual([1, 2]); expect(assertParticipant(channel, 2)).toHaveLength(2); });
  it("rejects public channels, group ownership, group collaborators and third parties", () => {
    const group = { id: 7, type: "Group" as const, name: "Directory", slug: "directory" };
    expect(() => participants({ ...channel, visibility: "closed" })).toThrow();
    expect(() => participants({ ...channel, owner: group })).toThrow();
    expect(() => participants({ ...channel, collaborators: [bob, group] })).toThrow();
    expect(() => participants({ ...channel, collaborators: [bob, { ...alice, id: 3 }] })).toThrow();
    expect(() => participants({ ...channel, collaborators: undefined })).toThrow();
    expect(() => assertParticipant(channel, 3)).toThrow();
    expect(() => assertParticipant({ ...channel, can: { add_to: false } }, 1)).toThrow();
  });
  it("does not consider a Connection: title proof of access", () => { expect(() => participants({ ...channel, collaborators: [] })).toThrow(); });
  it("groups attachments using the attaching person rather than the original creator", () => {
    const text = textBlock(1, alice, "one"); const attachment = { ...textBlock(2, alice, "one", "attachment"), type: "Image" as const, user: bob };
    const spoof = textBlock(3, bob, "one"); const result = groupMessages([spoof, attachment, text]);
    expect(result).toHaveLength(2); expect(result[0].sender.id).toBe(1); expect(result[0].attachments).toEqual([attachment]); expect(result[1].sender.id).toBe(2);
  });
  it("rejects empty replies and duplicate attachments", () => {
    const base = { requestId: "00000000-0000-4000-8000-000000000001", text: "", attachments: [] };
    expect(messageSchema.safeParse(base).success).toBe(false);
    expect(messageSchema.safeParse({ ...base, attachments: [{ id: 3, type: "Block" }] }).success).toBe(true);
    expect(messageSchema.safeParse({ ...base, attachments: [{ id: 3, type: "Block" }, { id: 3, type: "Block" }] }).success).toBe(false);
  });
});
describe("profile parsing", () => {
  it("finds details by its stable title despite ordering and gracefully handles malformed YAML", () => {
    const block = { ...textBlock(2, alice, "x"), title: "details", content: { plain: "", markdown: serializeDetails(details) } };
    expect(assembleProfile(channel, [block], alice).details).toEqual(details);
    expect(assembleProfile(channel, [{ ...block, content: { plain: "", markdown: "bad" } }], alice).warning).toBeTruthy();
  });
});
