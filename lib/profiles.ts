import { profilePrompts } from "./prompts";
import { locationMetadata, locationSchema } from "./locations";
import { ArenaClient, ArenaError } from "./arena";
import { blankDetails, parseDetails, profileInputSchema, serializeDetails } from "./details";
import type { Item, Profile, Person } from "./types";
import { groupId } from "./config";
import { withLock } from "./coordination";
import { allItems } from "./arena-discovery";
import { unsealData } from "iron-session";
import { itemKey, safeUrl } from "./urls";
import type { z } from "zod";
import { directoryClient, directoryToken } from "./directory-auth";
import { addIndividualCollaborator } from "./conversations";

export const roleOf = (item: Item) => item.connection?.metadata?.role || item.metadata?.role;
const descriptionRef = (item: Item) => `${item.connection?.metadata?.selected_type}:${item.connection?.metadata?.selected_id}`;
export function assembleProfile(channel: Item, items: Item[], person: Person): Profile {
  const details = items.find(x => x.type === "Text" && x.title === "details");
  const biography = items.find(x => x.type === "Text" && (roleOf(x) === "biography" || x.title === "Who are you?"));
  const description = items.find(x => x.type === "Text" && (roleOf(x) === "description" || x.title === "What you’re looking for"));
  const link = items.find(x => roleOf(x) === "profile_link");
  const photo = items.find(x => roleOf(x) === "photo");
  let parsed = blankDetails; let warning: string | undefined;
  try { parsed = parseDetails(details?.content?.markdown || ""); } catch { warning = "This profile's details need updating."; }
  // Retain backfilled IDs when the older details block still names the same place.
  if (!parsed.location.id && channel.metadata?.location_city === parsed.location.city && channel.metadata?.location_country === locationMetadata(parsed.location).location_country) {
    const location = locationSchema.safeParse({ ...parsed.location, id: channel.metadata.location_id, region: channel.metadata.location_region || "", country_code: channel.metadata.location_country });
    if (location.success) parsed = { ...parsed, location: location.data };
  }
  const managed = new Set([details?.id, biography?.id, description?.id, link?.id, photo?.id]);
  const orderedItems = channel.metadata?.display_order === "position_desc" ? [...items].sort((a, b) => (b.connection?.position || 0) - (a.connection?.position || 0)) : items;
  const selected = orderedItems.filter(x => roleOf(x) === "selected" || (!roleOf(x) && !managed.has(x.id)));
  for (const prompt of Object.values(parsed.selected_prompts || {})) {
    const author = items.find(item => roleOf(item) === "selected_prompt" && item.id === prompt.id)?.user;
    if (author?.name && author.slug) prompt.author = { name: author.name, slug: author.slug };
  }
  const selectedDescriptions = Object.fromEntries(items.filter(x => x.type === "Text" && roleOf(x) === "selected_description").map(x => [descriptionRef(x), x.content?.markdown || ""]));
  return { selectedDescriptions, channel, person, whoAreYou: biography?.content?.markdown || "", biographyBlock: biography, lookingFor: description?.content?.markdown || "", details: parsed, selected, photo, profileLink: link, descriptionBlock: description, detailsBlock: details, warning };
}
export async function readProfile(channelId: string | number, client = new ArenaClient(), knownChannel?: Item): Promise<Profile> {
  const [channel, contents] = await Promise.all([knownChannel || client.item("Channel", channelId), allItems(client, `/channels/${channelId}/contents`)]);
  if (channel.visibility === "private" || channel.metadata?.app !== "connections" || !channel.metadata?.profile_user_id) throw new Error("This is not a published Connections profile.");
  const userId = Number(channel.metadata.profile_user_id);
  const embeddedPerson = contents.flatMap(item => [item.user, item.connection?.connected_by]).find(person => person?.type === "User" && person.id === userId && person.name && person.slug && person.avatar);
  const person = embeddedPerson || await client.user(userId);
  return assembleProfile(channel, contents.filter(item => item.visibility !== "private" && item.state === "available"), person);
}
export async function recentPublic(user: number, type: "Block" | "Channel") {
  const client = new ArenaClient(undefined, false);
  const items: Item[] = [];
  let page: number | null = 1;
  // Profile text and description blocks can fill the first page. Keep looking
  // for public items so both recent grids can contain four items.
  for (let attempt = 0; page && attempt < 3 && items.length < 4; attempt++) {
    const result = await client.userContents(user, type, page, 24, "updated_at_desc");
    for (const item of result.data) {
      if (item.state !== "available" || item.visibility === "private" || item.metadata?.app === "connections" || item.title?.startsWith("Connection:")) continue;
      if (item.type === "Channel" ? item.owner?.type !== "User" || item.owner.id !== user : item.user?.id !== user) continue;
      if (!items.some(existing => existing.id === item.id)) items.push(item);
    }
    page = result.meta.next_page && result.meta.next_page > page ? result.meta.next_page : null;
  }
  // The API selects pages by date but can return each page out of order.
  // Rank every eligible item in the batch before choosing the visible four.
  return items.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at) || b.id - a.id).slice(0, 4);
}
export async function verifySelection(client: ArenaClient, person: Person, refs: { id: number; type: "Block" | "Channel" }[]) {
  const items = await Promise.all(refs.map(x => client.item(x.type, x.id)));
  for (const item of items) {
    if (item.visibility === "private" || item.state !== "available") throw new Error("Choose publicly visible, available items for your profile.");
    if (item.metadata?.app === "connections" || item.title?.startsWith("Connection:")) throw new Error("Choose your own collections rather than a profile or conversation.");
  }
  // Check public visibility without borrowing the signed-in user's private access.
  await Promise.all(refs.map(x => new ArenaClient(undefined, false).item(x.type, x.id)));
  return items;
}
export async function availableProfileRef(userId: number, client: ArenaClient) {
  if (!groupId()) return undefined;
  const manager = process.env.ARENA_OPERATOR_TOKEN || process.env.ARENA_DIRECTORY_CREDENTIAL ? await directoryClient("") : client;
  const channels = await allItems(manager, `/groups/${groupId()}/contents?type=Channel&sort=created_at_asc`);
  for (const candidate of channels.filter(item => item.metadata?.app === "connections" && Number(item.metadata.profile_user_id) === userId)) {
    try {
      const channel = await manager.item("Channel", candidate.id);
      if (channel.owner?.type !== "Group" || channel.owner.id !== groupId() || Number(channel.metadata?.profile_user_id) !== userId) continue;
      return { user_id: userId, channel_id: channel.id, published: channel.metadata?.published === true ? 1 : 0 };
    } catch (error) { if (!(error instanceof ArenaError) || error.status !== 404) throw error; }
  }
  return undefined;
}

export async function deleteProfile(person: Person, token: string, channelId: number) {
  if (!Number.isSafeInteger(channelId) || channelId <= 0) throw new ArenaError(400, "Invalid profile.");
  return withLock(`profile:${person.id}`, async () => {
    const manager = await directoryClient(token);
    const channel = await manager.item("Channel", channelId);
    if (!groupId() || channel.owner?.type !== "Group" || channel.owner.id !== groupId() || channel.metadata?.app !== "connections" || Number(channel.metadata.profile_user_id) !== person.id) {
      throw new ArenaError(403, "You can only delete your own profile.");
    }
    await manager.request(`/channels/${channel.id}`, { method: "DELETE" });
    return { deleted: true };
  });
}

export async function saveProfile(person: Person, token: string, raw: unknown) {
  const input = profileInputSchema.parse(raw); const client = new ArenaClient(token);
  if (!groupId()) throw new Error("The directory has not been configured yet.");
  return withLock(`profile:${person.id}`, async () => {
    const verifiedSelections = await verifySelection(client, person, input.selected);
    const requestedPrompts = input.selected.flatMap(item => item.prompt ? [item.prompt] : []);
    if (requestedPrompts.length) {
      const catalog = await profilePrompts();
      const priorRef = await availableProfileRef(person.id, client);
      const priorPrompts = priorRef ? Object.values((await readProfile(priorRef.channel_id, client)).details.selected_prompts || {}) : [];
      for (const prompt of requestedPrompts) {
        const canonical = [...catalog, ...priorPrompts].find(candidate => candidate.id === prompt.id && candidate.text === prompt.text);
        if (!canonical) throw new Error("A selected prompt has changed. Remix it and try again.");
        prompt.author = canonical.author;
      }
    }
    const manager = await directoryClient(token);
    const group = await manager.request<{ can?: { manage_members?: boolean } }>(`/groups/${groupId()}`);
    if (!group.can?.manage_members) throw new Error("The directory's account needs to reconnect Are.na before profiles can be published.");
    let ref = await availableProfileRef(person.id, client);
    let channel: Item;
    if (ref) {
      channel = await manager.item("Channel", ref.channel_id);
      if (!channel.can?.update || Number(channel.metadata?.profile_user_id) !== person.id) throw new Error("You cannot edit this profile.");
    } else {
      channel = await manager.createChannel(person.name, { owner: { id: groupId()!, type: "Group" }, metadata: { app: "connections", schema_version: 1, profile_user_id: person.id, submission_id: `profile:${person.id}`, published: false } });
      ref = { user_id: person.id, channel_id: channel.id, published: 0 };
    }
    const userOwned = channel.owner?.type === "User" && channel.owner.id === person.id;
    if (!userOwned && !(channel.owner?.type === "Group" && channel.owner.id === groupId())) throw new Error("This channel does not belong to the profile author or Connections group.");
    let memberChannel: Item | undefined;
    try { memberChannel = await client.item("Channel", channel.id); } catch { /* Grant the profile author access below. */ }
    if (!memberChannel?.can?.add_to) {
      await addIndividualCollaborator(await directoryToken(token), channel.id, person.id);
      memberChannel = await client.item("Channel", channel.id);
      if (!memberChannel.can?.add_to) throw new Error("Are.na has not granted you access to your profile channel yet. Try again shortly.");
    }
    // Re-read after each retry; successfully created blocks keep their connection roles.
    const items = await allItems(client, `/channels/${channel.id}/contents`);
    const upsert = async (role: string, title: string, value: string) => {
      const existing = items.find(x => roleOf(x) === role || (role === "details" && x.type === "Text" && x.title === "details"));
      if (!existing) return client.createBlock(channel.id, title, value, role);
      if (existing.user?.id !== person.id) throw new Error("A managed block is owned by a different account. Restore it on Are.na before editing.");
      return client.updateBlock(existing.id, { title, ...(existing.type === "Text" ? { content: value } : {}) });
    };
    for (const item of items) if (roleOf(item) === "profile_link" && item.connection) await client.disconnect(item.connection.id);
    await upsert("biography", "Who are you?", input.whoAreYou);
    await upsert("description", "What you’re looking for", input.lookingFor);
    await upsert("details", "details", serializeDetails({ ...input.details, selected_prompts: Object.fromEntries(input.selected.filter(item => item.prompt).map(item => [`${item.type}:${item.id}`, item.prompt!])) }));
    await savePhoto(client, person, channel.id, input, items);
    const oldPrompts = items.filter(x => roleOf(x) === "selected_prompt");
    const oldSelections = items.filter(x => roleOf(x) === "selected");
    const oldDescriptions = items.filter(x => roleOf(x) === "selected_description");
    for (let i = 0; i < input.selected.length; i++) {
      const selected = input.selected[i]; const key = `${selected.type}:${selected.id}`;
      if (selected.prompt && !oldPrompts.some(item => item.id === selected.prompt!.id)) {
        await client.connect(channel.id, { id: selected.prompt.id, type: "Block" }, { role: "selected_prompt", app: "connections" });
      }
      const existing = oldSelections.find(x => itemKey(x) === key);
      if (!existing) await client.connect(channel.id, selected, { role: "selected", app: "connections" });
      const description = oldDescriptions.find(x => descriptionRef(x) === key);
      if (selected.description) {
        const title = verifiedSelections[i].title || "Untitled";
        if (description) {
          if (description.user?.id !== person.id) throw new Error("This item's description belongs to another account.");
          await client.updateBlock(description.id, { title, content: selected.description });
        } else await client.createBlock(channel.id, title, selected.description, "selected_description", { selected_type: selected.type, selected_id: selected.id });
      }
    }
    for (const previous of oldPrompts) if (!input.selected.some(item => item.prompt?.id === previous.id) && previous.connection) await client.disconnect(previous.connection.id);
    for (const previous of oldSelections) if (!input.selected.some(x => `${x.type}:${x.id}` === itemKey(previous)) && previous.connection) await client.disconnect(previous.connection.id);
    for (const previous of oldDescriptions) if (!input.selected.some(x => `${x.type}:${x.id}` === descriptionRef(previous) && x.description) && previous.connection) await client.disconnect(previous.connection.id);
    // Are.na displays highest positions first. Move the reversed display
    // sequence to the top, keeping each original followed by its description.
    const arranged = await allItems(client, `/channels/${channel.id}/contents`);
    const displayOrder = ["biography", "description", "photo", "details"].map(role => arranged.find(item => roleOf(item) === role));
    for (const selected of input.selected) {
      const key = `${selected.type}:${selected.id}`;
      displayOrder.push(selected.prompt ? arranged.find(item => roleOf(item) === "selected_prompt" && item.id === selected.prompt!.id) : undefined, arranged.find(item => roleOf(item) === "selected" && itemKey(item) === key), arranged.find(item => roleOf(item) === "selected_description" && descriptionRef(item) === key));
    }
    for (const item of displayOrder.reverse()) if (item?.connection) await client.request(`/connections/${item.connection.id}/move`, { method: "POST", body: { movement: "move_to_top" } });
    await (userOwned ? client : manager).updateChannel(channel.id, { title: person.name, description: `https://www.are.na/${person.slug}`, metadata: { published: true, display_order: "position_desc", ...locationMetadata(input.details.location) } });

    return { channelId: channel.id };
  });
}
async function savePhoto(client: ArenaClient, person: Person, channel: number, input: z.infer<typeof profileInputSchema>, items: Item[]) {
  const old = items.filter(x => roleOf(x) === "photo");
  if (input.photoKey) {
    const upload = await unsealData<{ key?: string; userId?: number; expires?: number }>(input.photoProof || "", { password: process.env.SESSION_SECRET!, ttl: 3600 });
    if (upload.key !== input.photoKey || upload.userId !== person.id || !upload.expires || upload.expires < Date.now()) throw new Error("The photo upload expired. Please select your photo again.");
    const existing = old.find(x => x.connection?.metadata?.upload_key === input.photoKey);
    if (!existing) {
      await client.createBlock(channel, person.name, `https://s3.amazonaws.com/arena_images-temp/${input.photoKey}`, "photo", { upload_key: input.photoKey });
    }
    for (const photo of old) if (photo.id !== existing?.id && photo.connection) await client.disconnect(photo.connection.id);
  } else if (input.removePhoto) {
    for (const photo of old) if (photo.connection) await client.disconnect(photo.connection.id);
  } else if (input.useAccountPhoto) {
    const existing = old.find(x => x.connection?.metadata?.photo_source === "account");
    if (!existing) {
      const account = await client.user(person.id);
      const avatar = safeUrl(account.avatar);
      if (!avatar) throw new Error("Your Are.na photo is unavailable. Choose a photo before saving.");
      await client.createBlock(channel, person.name, avatar, "photo", { photo_source: "account" });
    }
    for (const photo of old) if (photo.id !== existing?.id && photo.connection) await client.disconnect(photo.connection.id);
  } else if (old[0]?.user?.id === person.id && old[0].title !== person.name) await client.updateBlock(old[0].id, { title: person.name });
}
