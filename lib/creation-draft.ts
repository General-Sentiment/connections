import { z } from "zod";
import { intentions, promptSchema } from "./details";

// Drafts intentionally allow incomplete fields and empty selection slots.
const ownerSchema = z.object({ id: z.number(), type: z.enum(["User", "Group"]), name: z.string(), slug: z.string() });
const imageSchema = z.object({ src: z.string().optional(), alt_text: z.string().optional(), medium: z.object({ src: z.string() }).optional() });
const itemSchema = z.object({
  id: z.number().int().positive(), type: z.enum(["Channel", "Text", "Image", "Link", "Embed", "Attachment", "Pending"]),
  title: z.string().nullable(), visibility: z.string(), state: z.string(), created_at: z.string(), updated_at: z.string(),
  owner: ownerSchema.optional(), image: imageSchema.nullable().optional(),
  content: z.object({ markdown: z.string(), plain: z.string() }).optional(),
  counts: z.object({ blocks: z.number(), channels: z.number(), contents: z.number() }).optional(),
  source: z.object({ url: z.string(), provider: z.object({ name: z.string() }).optional() }).nullable().optional(),
});
const draftSchema = z.object({
  version: z.literal(1), step: z.number().int().nonnegative(),
  whoAreYou: z.string().max(5000), lookingFor: z.string().max(5000),
  details: z.object({
    schema: z.literal("connections_profile"), version: z.literal(1),
    location: z.object({ city: z.string().max(100), country: z.string().max(100), id: z.string().optional(), region: z.string().optional(), country_code: z.string().optional() }),
    open_to: z.array(z.enum(intentions.map(([value]) => value))), local_only: z.boolean(),
  }),
  selected: z.array(itemSchema.nullable()), prompts: z.array(promptSchema.nullable()).min(3),
  selectedDescriptions: z.record(z.string(), z.string().max(5000)),
  useAccountPhoto: z.boolean(), removePhoto: z.boolean(),
});
export type CreationDraft = z.infer<typeof draftSchema>;
export function creationDraftKey(personId: number, demo: boolean) { return `v1:${demo ? "demo" : "live"}:${personId}`; }
export function parseCreationDraft(value: unknown): CreationDraft | undefined {
  const result = draftSchema.safeParse(value);
  if (!result.success) return undefined;
  return { ...result.data, step: Math.min(result.data.step, 6 + result.data.prompts.length) };
}

let connection: Promise<IDBDatabase> | undefined;
function database() {
  if (!connection) connection = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("connections-creation-drafts", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("drafts");
      request.result.createObjectStore("photos");
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); connection = undefined; };
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Draft storage is unavailable."));
  }).catch(error => { connection = undefined; throw error; });
  return connection;
}
async function transaction<T>(mode: IDBTransactionMode, work: (tx: IDBTransaction) => () => T): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["drafts", "photos"], mode);
    const result = work(tx);
    tx.oncomplete = () => resolve(result());
    tx.onabort = () => reject(tx.error || new Error("Draft storage is unavailable."));
    tx.onerror = () => reject(tx.error);
  });
}
export async function readCreationDraft(key: string) {
  const stored = await transaction("readonly", tx => {
    const draft = tx.objectStore("drafts").get(key);
    const photo = tx.objectStore("photos").get(key);
    return () => ({ draft: parseCreationDraft(draft.result), photo: photo.result });
  });
  const photo = stored.photo;
  return {
    draft: stored.draft,
    photo: stored.draft && photo?.blob instanceof Blob && photo.blob.size <= 10 * 1024 * 1024 &&
      ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(photo.blob.type) && typeof photo.name === "string"
      ? new File([photo.blob], photo.name, { type: photo.blob.type, lastModified: photo.lastModified }) : undefined,
  };
}
export async function saveCreationDraft(key: string, draft: CreationDraft) {
  const value = draftSchema.parse(draft);
  await transaction("readwrite", tx => { tx.objectStore("drafts").put(value, key); return () => undefined; });
}
// Photos are written separately so typing doesn't repeatedly copy a large file.
export async function saveCreationPhoto(key: string, photo?: File) {
  await transaction("readwrite", tx => {
    const store = tx.objectStore("photos");
    if (photo) store.put({ blob: photo, name: photo.name, lastModified: photo.lastModified }, key);
    else store.delete(key);
    return () => undefined;
  });
}
export async function clearCreationDraft(key: string) {
  await transaction("readwrite", tx => {
    tx.objectStore("drafts").delete(key); tx.objectStore("photos").delete(key);
    return () => undefined;
  });
}
