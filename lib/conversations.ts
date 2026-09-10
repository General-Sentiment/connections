import { createHash } from "node:crypto";
import { z } from "zod";
import { ArenaClient, ArenaError } from "./arena";
import { conversationRef, conversationRefs, database, pairKey, rememberConversation, withLock } from "./store";
import type { Item, Message, Page, Person } from "./types";
import { selectionSchema } from "./details";

// v3 has no collaborator mutation. Keep the documented v2 compatibility call
// isolated, then verify the resulting access with v3 before writing a message.
export async function addIndividualCollaborator(token: string, channel: number, user: number) {
  const response = await fetch(`https://api.are.na/v2/channels/${channel}/collaborators`, {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(20000),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ ids: [user] }),
  });
  if (!response.ok) throw new ArenaError(response.status, "Are.na could not add your connection to this private channel. No message has been sent. You can add them as a collaborator on Are.na, then retry.");
}
export function participants(channel: Item): Person[] {
  if (channel.type !== "Channel" || channel.visibility !== "private" || channel.owner?.type !== "User" || !channel.title?.startsWith("Connection:")) throw new Error("This must be a private, individually owned channel whose title starts with Connection:.");
  if (!Array.isArray(channel.collaborators)) throw new Error("Are.na did not provide the channel's access list.");
  if (channel.collaborators.some(x => x.type !== "User")) throw new Error("This channel grants access to a group. It cannot be used as a private two-person conversation.");
  const people = Array.from(new Map([channel.owner, ...channel.collaborators].map(x => [x.id, x as Person])).values());
  if (people.length !== 2) throw new Error("A conversation must have exactly two people with access. Check its collaborators on Are.na.");
  return people;
}
export function assertParticipant(channel: Item, user: number) {
  const people = participants(channel);
  if (!people.some(x => x.id === user)) throw new ArenaError(403, "You do not have access to this conversation.");
  if (!channel.can?.add_to) throw new ArenaError(403, "You do not have write access to this conversation.");
  return people;
}
export async function discoverConversations(client: ArenaClient, person: Person, page = 1) {
  let candidates: Page<Item>; let limited = false;
  try { candidates = await client.request<Page<Item>>(`/search?query=${encodeURIComponent("Connection:")}&scope=my&type=Channel&page=${page}&per=24&sort=updated_at_desc`); }
  catch (e) { if (!(e instanceof ArenaError) || e.status !== 403) throw e; candidates = await client.userContents(person.id, "Channel", page, 24); limited = true; }
  const known = page === 1 ? conversationRefs(person.id).map(ref => ref.channel_id) : [];
  const ids = [...new Set([...candidates.data.filter(x => x.title?.startsWith("Connection:") && x.visibility === "private").map(x => x.id), ...known])];
  const valid: Item[] = [];
  // This is one bounded page of the user's relevant channels, not account enumeration.
  for (const id of ids.slice(0, 24)) {
    try { const channel = await client.item("Channel", id); const members = assertParticipant(channel, person.id); rememberConversation(members[0].id, members[1].id, channel.id); valid.push(channel); } catch (e) { if (e instanceof ArenaError && e.status === 429) throw e; }
  }
  return { channels: valid, next: candidates.meta.next_page, limited };
}
export function groupMessages(items: Item[]): Message[] {
  const messages = new Map<string, Message>();
  for (const item of [...items].sort((a, b) => (a.connection?.position || 0) - (b.connection?.position || 0))) {
    const connection = item.connection; if (!connection) continue;
    // Include author ID in the group key so another collaborator cannot impersonate
    // someone by copying their message metadata onto a new connection.
    const id = `${connection.connected_by.id}:${connection.metadata?.message_id || connection.id}`;
    let message = messages.get(id);
    if (!message) { message = { id, sender: connection.connected_by, sentAt: connection.connected_at, text: "", attachments: [] }; messages.set(id, message); }
    if (item.type === "Text" && (!connection.metadata?.role || connection.metadata.role === "message")) message.text += (message.text ? "\n\n" : "") + (item.content?.markdown || "");
    else message.attachments.push(item);
  }
  return [...messages.values()].sort((a, b) => new Date(a.sentAt).valueOf() - new Date(b.sentAt).valueOf());
}
export const messageSchema = z.object({
  requestId: z.string().uuid(), text: z.string().trim().max(10000), attachments: z.array(selectionSchema).max(6),
}).strict().refine(x => x.text.length || x.attachments.length, "Write a message or attach an item.").refine(x => new Set(x.attachments.map(a => `${a.type}:${a.id}`)).size === x.attachments.length, "Attach each item only once.");

export async function ensureConversation(client: ArenaClient, token: string, sender: Person, recipient: Person) {
  if (sender.id === recipient.id) throw new Error("Choose another person to connect with.");
  return withLock(`pair:${pairKey(sender.id, recipient.id)}`, async () => {
    let ref = conversationRef(sender.id, recipient.id);
    if (!ref) {
      // First check the authenticated user's visible channels before creating a new one.
      await discoverConversations(client, sender);
      ref = conversationRef(sender.id, recipient.id);
    }
    let channel: Item;
    if (ref) channel = await client.item("Channel", ref.channel_id);
    else {
      channel = await client.createChannel(`Connection: ${sender.name} & ${recipient.name}`, { visibility: "private", metadata: { app: "connections", role: "conversation", pair: pairKey(sender.id, recipient.id) } });
      rememberConversation(sender.id, recipient.id, channel.id);
      channel = await client.item("Channel", channel.id);
    }
    const access = [channel.owner, ...(channel.collaborators || [])].filter(Boolean);
    if (channel.owner?.type !== "User" || ![sender.id, recipient.id].includes(channel.owner.id) || channel.visibility !== "private") throw new Error("The existing channel no longer has private two-person ownership.");
    if (access.some(x => x?.type !== "User" || ![sender.id, recipient.id].includes(x.id))) throw new Error("This channel has additional collaborators. Check its access on Are.na.");
    if (!access.some(x => x?.id === recipient.id)) {
      if (channel.owner.id !== sender.id) throw new Error("The channel owner must add the other participant on Are.na.");
      await addIndividualCollaborator(token, channel.id, recipient.id);
    }
    channel = await client.item("Channel", channel.id);
    const members = assertParticipant(channel, sender.id);
    if (!members.some(x => x.id === recipient.id)) throw new Error("Your connection does not have access yet. No message has been sent.");
    return channel;
  });
}
export async function sendMessage(client: ArenaClient, person: Person, channelId: number, raw: unknown) {
  const input = messageSchema.parse(raw); const operation = `message:${person.id}:${input.requestId}`;
  return withLock(`send:${channelId}`, async () => {
    const channel = await client.item("Channel", channelId); assertParticipant(channel, person.id);
    const hash = createHash("sha256").update(JSON.stringify({ channelId, text: input.text, attachments: input.attachments })).digest("hex");
    const prior = database().prepare("SELECT * FROM operations WHERE key=?").get(operation) as { hash: string; status: string } | undefined;
    if (prior && prior.hash !== hash) throw new Error("This message changed during a retry. Reload the conversation before sending it again.");
    if (prior?.status === "complete") return { channelId };
    await Promise.all(input.attachments.map(x => client.item(x.type, x.id)));
    database().prepare("INSERT OR IGNORE INTO operations VALUES(?,?,NULL,'pending',?)").run(operation, hash, Date.now());
    const recent = await client.contents(channelId, 1, 100, "position_desc");
    const existing = recent.data.filter(x => x.connection?.metadata?.message_id === input.requestId && x.connection.connected_by.id === person.id);
    for (const attachment of input.attachments) {
      const old = recent.data.find(x => x.id === attachment.id && (x.type === "Channel" ? "Channel" : "Block") === attachment.type);
      if (old && old.connection?.metadata?.message_id !== input.requestId) throw new Error("That item is already in this conversation. Remove it from this reply before sending.");
    }
    if (input.text && !existing.some(x => x.connection?.metadata?.role === "message")) await client.createBlock(channelId, person.name, input.text, "message", { message_id: input.requestId });
    for (const attachment of input.attachments) {
      if (!existing.some(x => x.id === attachment.id && (x.type === "Channel" ? "Channel" : "Block") === attachment.type)) {
        // Are.na may allow only one connection of an item per channel. Do not move
        // an old attachment into a new message; fail explicitly if already present.
        await client.connect(channelId, attachment, { app: "connections", role: "attachment", message_id: input.requestId });
      }
    }
    database().prepare("UPDATE operations SET status='complete',updated=? WHERE key=?").run(Date.now(), operation);
    return { channelId };
  });
}
