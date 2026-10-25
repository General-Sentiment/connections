import { createHash, randomUUID, randomBytes } from "node:crypto";
import { z } from "zod";
import { directoryClient } from "./directory-auth";
import { allItems } from "./arena-discovery";
import { ArenaError } from "./arena";
import { plotChannel, plotYaml, parsePlotYaml, readActivePlotPrompt, pinnedPrompt } from "./plot-pairings";
import { withLock } from "./coordination";
import { blankDetails } from "./details";
import type { Profile } from "./types";
export const guestInput = z.object({ id: z.string().uuid(), secret: z.string().min(32).max(128), name: z.string().trim().min(1).max(100) });
const record = z.object({ id: z.string().uuid(), userId: z.number().int().positive(), name: z.string(), secretHash: z.string(), manual: z.boolean() });
const registry = z.object({ schema: z.literal("plot_participants"), participants: z.array(record) });
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
async function read(token = "") {
  const manager = await directoryClient(token);
  const items = await allItems(manager, `/channels/${encodeURIComponent(plotChannel())}/contents`);
  const blocks = items.filter(item => item.title === "participants" && item.type === "Text");
  if (blocks.length > 1) throw new Error("Plot has multiple participants blocks.");
  return { manager, block: blocks[0], data: blocks[0] ? parsePlotYaml(blocks[0].content?.markdown || "", registry) : { schema: "plot_participants" as const, participants: [] } };
}
export async function registerPlotGuest(input: z.infer<typeof guestInput>, manual = false, token = "") {
  return withLock(`plot-guests:${plotChannel()}`, async () => {
    const { manager, block, data } = await read(token);
    const existing = data.participants.find(person => person.id === input.id);
    if (existing && existing.secretHash !== digest(input.secret)) throw new ArenaError(403, "That guest identity could not be restored.");
    if (existing) return { id: existing.id, userId: existing.userId, name: existing.name };
    const userId = 100000000000000 + parseInt(digest(input.id).slice(0, 12), 16);
    if (data.participants.some(person => person.userId === userId)) throw new Error("Please try joining again.");
    const entry = { id: input.id, userId, name: input.name, secretHash: digest(input.secret), manual };
    data.participants.push(entry);
    const content = plotYaml(data);
    if (block) await manager.updateBlock(block.id, { content });
    else { const channel = await manager.item("Channel", plotChannel()); await manager.createBlock(channel.id, "participants", content, "plot_participants"); }
    return { id: entry.id, userId, name: entry.name };
  });
}
export async function addManualPlotGuest(name: string, token: string) {
  const id = randomUUID(); const secret = randomBytes(24).toString("hex");
  const guest = await registerPlotGuest({ id, secret, name }, true, token);
  return { ...guest, joinCode: `${id}.${secret}` };
}
export async function readPlotGuestProfiles(answered?: ReadonlySet<number>) {
  const { data } = await read();
  return data.participants.filter(person => person.manual || !answered || answered.has(person.userId)).map(person => ({
    person: { id: person.userId, type: "User", name: person.name, slug: "" },
    channel: { id: person.userId, type: "Channel", title: person.name, visibility: "closed", state: "available", created_at: "", updated_at: "", metadata: { plot_guest: true } },
    details: { ...blankDetails, open_to: [], local_only: false }, selected: [], lookingFor: "",
  } as Profile));
}
export async function saveGuestPlotAnswer(guest: { userId: number; name: string }, promptId: number, text: string, requestId: string) {
  return withLock(`plot-guest-answer:${guest.userId}`, async () => {
    const manager = await directoryClient("");
    const active = await readActivePlotPrompt();
    const channel = await manager.item("Channel", `plot-prompt-${active}`);
    const items = await allItems(manager, `/channels/${channel.id}/contents`);
    const prompt = pinnedPrompt(items);
    if (prompt.id !== promptId) throw new ArenaError(409, "The prompt changed. Your draft is saved on this device; refresh to answer the current prompt.");
    const existing = items.find(item => item.connection?.metadata?.guest_user_id === guest.userId && !item.connection?.pinned);
    if (existing) {
      if (existing.content?.markdown !== text) await manager.updateBlock(existing.id, { content: text });
      return { answerId: existing.id };
    }
    const answer = await manager.createBlock(channel.id, guest.name, text, "plot_guest_answer", { guest_user_id: guest.userId, guest_name: guest.name, prompt_id: promptId, request_id: requestId });
    return { answerId: answer.id };
  });
}
