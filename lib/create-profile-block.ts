import { z } from "zod";
import { unsealData } from "iron-session";
import { ArenaClient, ArenaError } from "./arena";
import { availableProfileRef } from "./profiles";
import { directoryClient, directoryToken } from "./directory-auth";
import { groupId } from "./config";
import { addIndividualCollaborator } from "./conversations";
import { allItems } from "./arena-discovery";
import { withLock } from "./coordination";
import type { Person } from "./types";
export const createProfileBlockSchema = z.object({
  value: z.string().trim().min(1).max(50000).optional(),
  uploadKey: z.string().max(1000).optional(), uploadProof: z.string().max(4000).optional(),
  title: z.string().trim().max(300).default(""), requestId: z.string().uuid(),
  plotPromptId: z.number().int().positive().optional(),
}).strict().refine(input => Boolean(input.value) !== Boolean(input.uploadKey), "Enter text, a URL, or choose an image.");
export async function createProfileBlock(person: Person, token: string, input: z.infer<typeof createProfileBlockSchema>) {
  return withLock(`profile:${person.id}`, async () => {
    const client = new ArenaClient(token);
    let value = input.value || "";
    if (input.uploadKey) {
      const proof = await unsealData<{ key?: string; userId?: number; expires?: number }>(input.uploadProof || "", { password: process.env.SESSION_SECRET!, ttl: 3600 });
      if (proof.key !== input.uploadKey || proof.userId !== person.id || !proof.expires || proof.expires < Date.now()) throw new ArenaError(400, "Your image upload expired. Choose the image again.");
      value = `https://s3.amazonaws.com/arena_images-temp/${input.uploadKey.split("/").map(encodeURIComponent).join("/")}`;
    } else if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) && !/^https?:\/\//i.test(value)) throw new ArenaError(400, "Use an http or https URL.");
    let ref = await availableProfileRef(person.id, client);
    if (input.plotPromptId && !ref?.published) throw new ArenaError(400, "Create your profile before answering a Plot prompt.");
    if (!ref) {
      if (input.plotPromptId) throw new ArenaError(400, "Create your profile before answering a Plot prompt.");
      if (!groupId()) throw new Error("The directory is not configured.");
      const manager = await directoryClient(token);
      const channel = await manager.createChannel(person.name, { owner: { id: groupId()!, type: "Group" }, metadata: { app: "connections", schema_version: 1, profile_user_id: person.id, submission_id: `profile:${person.id}`, published: false } });
      ref = { user_id: person.id, channel_id: channel.id, published: 0 };
    }
    let channel = await client.item("Channel", ref.channel_id);
    if (Number(channel.metadata?.profile_user_id) !== person.id) throw new ArenaError(403, "You can only add blocks to your own profile.");
    if (!channel.can?.add_to) {
      await addIndividualCollaborator(await directoryToken(token), channel.id, person.id);
      channel = await client.item("Channel", channel.id);
      if (!channel.can?.add_to) throw new ArenaError(403, "Your profile channel is not writable yet. Try again.");
    }
    const items = await allItems(client, `/channels/${channel.id}/contents`);
    const existing = items.find(item => item.connection?.metadata?.creation_id === input.requestId);
    if (existing) return existing;
    return client.request<import("./types").Item>("/blocks", { method: "POST", body: { value, title: input.title || (input.uploadKey ? "" : value.split("\n")[0].slice(0, 100)), channels: [{ id: channel.id, metadata: { app: "connections", role: "selected", creation_id: input.requestId } }] } });
  });
}
