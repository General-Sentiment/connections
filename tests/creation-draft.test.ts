import "fake-indexeddb/auto";
import { IDBDatabase } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import { blankDetails } from "../lib/details";
import { clearCreationDraft, creationDraftKey, parseCreationDraft, readCreationDraft, saveCreationDraft, saveCreationPhoto, type CreationDraft } from "../lib/creation-draft";

const draft = (): CreationDraft => ({
  version: 1, step: 5, whoAreYou: "An unfinished introduction", lookingFor: "",
  details: structuredClone(blankDetails), selected: [null, { id: 12, type: "Text", title: "A favorite", visibility: "public", state: "available", created_at: "", updated_at: "", content: { markdown: "Favorite words", plain: "Favorite words" } }],
  prompts: [null, { id: 42, text: "What inspires you?" }, null], selectedDescriptions: { "Block:12": "An unfinished answer" }, useAccountPhoto: false, removePhoto: false,
});

describe("profile creation drafts", () => {
  it("preserves unfinished fields, empty slots, selected content, prompts, and the current step", async () => {
    const key = creationDraftKey(101, false);
    await saveCreationDraft(key, draft());
    expect((await readCreationDraft(key)).draft).toEqual(draft());
  });
  it("keeps accounts and demo mode separate", async () => {
    await saveCreationDraft(creationDraftKey(201, false), draft());
    expect((await readCreationDraft(creationDraftKey(202, false))).draft).toBeUndefined();
    expect((await readCreationDraft(creationDraftKey(201, true))).draft).toBeUndefined();
  });
  it("recovers the uploaded file without storing blob URLs or rewriting it for text changes", async () => {
    const key = creationDraftKey(301, false);
    const photo = new File([new Uint8Array([1, 2, 3])], "portrait.png", { type: "image/png", lastModified: 123 });
    await saveCreationDraft(key, draft());
    await saveCreationPhoto(key, photo);
    await saveCreationDraft(key, { ...draft(), whoAreYou: "More writing", step: 6 });
    const restored = await readCreationDraft(key);
    expect(restored.photo?.name).toBe("portrait.png");
    expect(restored.photo?.type).toBe("image/png");
    expect(restored.photo?.lastModified).toBe(123);
    expect(await restored.photo?.arrayBuffer()).toEqual(await photo.arrayBuffer());
    await saveCreationPhoto(key);
    expect((await readCreationDraft(key)).photo).toBeUndefined();
  });
  it("clears both draft and photo after completion without affecting other accounts", async () => {
    const key = creationDraftKey(401, false);
    const other = creationDraftKey(402, false);
    await saveCreationDraft(key, draft());
    await saveCreationPhoto(key, new File(["photo"], "photo.png", { type: "image/png" }));
    await saveCreationDraft(other, draft());
    await clearCreationDraft(key);
    expect(await readCreationDraft(key)).toEqual({ draft: undefined, photo: undefined });
    expect((await readCreationDraft(other)).draft).toEqual(draft());
  });
  it("keeps rapid writes in order and doesn't recreate a cleared draft", async () => {
    const key = creationDraftKey(501, false);
    await Promise.all([saveCreationDraft(key, draft()), saveCreationDraft(key, { ...draft(), whoAreYou: "Latest" })]);
    expect((await readCreationDraft(key)).draft?.whoAreYou).toBe("Latest");
    await Promise.all([saveCreationDraft(key, draft()), clearCreationDraft(key)]);
    expect((await readCreationDraft(key)).draft).toBeUndefined();
  });
  it("rejects broken or unsupported drafts and clamps stale step numbers", () => {
    expect(parseCreationDraft({ ...draft(), version: 2 })).toBeUndefined();
    expect(parseCreationDraft({ ...draft(), prompts: ["broken"] })).toBeUndefined();
    expect(parseCreationDraft({ ...draft(), selected: [{ id: 4, type: "Image", image: { medium: "bad" } }] })).toBeUndefined();
    expect(parseCreationDraft({ ...draft(), step: 100 })?.step).toBe(9);
  });
  it("reports storage failures without replacing an existing draft", async () => {
    const key = creationDraftKey(601, false);
    await saveCreationDraft(key, draft());
    const failure = vi.spyOn(IDBDatabase.prototype, "transaction").mockImplementation(() => { throw new Error("Storage blocked"); });
    await expect(saveCreationDraft(key, { ...draft(), whoAreYou: "Changed" })).rejects.toThrow("Storage blocked");
    failure.mockRestore();
    expect((await readCreationDraft(key)).draft).toEqual(draft());
  });
});
