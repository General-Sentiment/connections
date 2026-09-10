import { ArenaClient } from "./arena";
import { blankDetails, parseDetails, profileInputSchema, serializeDetails } from "./details";
import type { Item, Profile, Person } from "./types";
import { directoryId, groupId } from "./config";
import { database, ownerOfProfile, profileRef, publishProfile, rememberProfile, withLock } from "./store";
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
  const managed = new Set([details?.id, biography?.id, description?.id, link?.id, photo?.id]);
  const selected = items.filter(x => roleOf(x) === "selected" || (!roleOf(x) && !managed.has(x.id))).slice(0, 3);
  const selectedDescriptions = Object.fromEntries(items.filter(x => x.type === "Text" && roleOf(x) === "selected_description").map(x => [descriptionRef(x), x.content?.markdown || ""]));
  return { selectedDescriptions, channel, person, whoAreYou: biography?.content?.markdown || "", biographyBlock: biography, lookingFor: description?.content?.markdown || "", details: parsed, selected, photo, profileLink: link, descriptionBlock: description, detailsBlock: details, warning };
}
export async function readProfile(channelId: string | number, client = new ArenaClient()): Promise<Profile> {
  const [channel, contents] = await Promise.all([client.item("Channel", channelId), client.contents(channelId, 1, 24)]);
  if (channel.visibility === "private" || channel.metadata?.app !== "connections" || !channel.metadata?.profile_user_id) throw new Error("This is not a published Connections profile.");
  const person = await client.user(Number(channel.metadata.profile_user_id));
  return assembleProfile(channel, contents.data, person);
}
export async function recentPublic(user: number, type: "Block" | "Channel") {
  const client = new ArenaClient();
  const items: Item[] = [];
  let page: number | null = 1;
  // Profile text and description blocks can fill the first page. Keep looking
  // for public creations so both recent grids can contain four items.
  for (let attempt = 0; page && attempt < 3 && items.length < 4; attempt++) {
    const result = await client.userContents(user, type, page, 24);
    for (const item of result.data) {
      if (item.state !== "available" || item.visibility === "private" || item.metadata?.app === "connections" || item.title?.startsWith("Connection:")) continue;
      if (item.type === "Channel" ? item.owner?.type !== "User" || item.owner.id !== user : item.user?.id !== user) continue;
      if (!items.some(existing => existing.id === item.id)) items.push(item);
      if (items.length === 4) break;
    }
    page = result.meta.next_page && result.meta.next_page > page ? result.meta.next_page : null;
  }
  return items;
}
export async function verifySelection(client: ArenaClient, person: Person, refs: { id: number; type: "Block" | "Channel" }[]) {
  const items = await Promise.all(refs.map(x => client.item(x.type, x.id)));
  for (const item of items) {
    const owner = item.type === "Channel" ? item.owner : item.user;
    if (!owner || owner.type !== "User" || owner.id !== person.id) throw new Error("Choose blocks and channels created by your account.");
    if (item.visibility === "private" || item.state !== "available") throw new Error("Choose publicly visible, available items for your profile.");
    if (item.metadata?.app === "connections" || item.title?.startsWith("Connection:")) throw new Error("Choose your own collections rather than a profile or conversation.");
  }
  // Check public visibility without borrowing the signed-in user's private access.
  await Promise.all(refs.map(x => new ArenaClient(undefined, false).item(x.type, x.id)));
  return items;
}
export async function saveProfile(person: Person, token: string, raw: unknown) {
  const input = profileInputSchema.parse(raw); const client = new ArenaClient(token);
  if (!groupId() || !directoryId()) throw new Error("The directory has not been configured yet.");
  return withLock(`profile:${person.id}`, async () => {
    const verifiedSelections = await verifySelection(client, person, input.selected);
    const manager = await directoryClient(token);
    const directory = await manager.item("Channel", directoryId());
    if (directory.visibility === "private") throw new Error("The directory must be publicly visible.");
    if (!directory.can?.add_to) throw new Error("Your account needs permission to add a profile to the directory channel.");
    const group = await manager.request<{ can?: { manage_members?: boolean } }>(`/groups/${groupId()}`);
    if (!group.can?.manage_members) throw new Error("The directory's account needs to reconnect Are.na before profiles can be published.");
    let ref = profileRef(person.id);
    let channel: Item;
    if (ref) {
      channel = await manager.item("Channel", ref.channel_id);
      if (!channel.can?.update || ownerOfProfile(channel.id) !== person.id || Number(channel.metadata?.profile_user_id) !== person.id) throw new Error("You cannot edit this profile.");
    } else {
      channel = await manager.createChannel(person.name, { owner: { id: groupId()!, type: "Group" }, metadata: { app: "connections", schema_version: 1, profile_user_id: person.id, published: false } });
      rememberProfile(person.id, channel.id); ref = profileRef(person.id)!;
    }
    if (channel.owner?.type !== "Group" || channel.owner.id !== groupId()) throw new Error("Profile channels must be owned by the Connections group.");
    let memberChannel: Item | undefined;
    try { memberChannel = await client.item("Channel", channel.id); } catch { /* Grant the profile author access below. */ }
    if (!memberChannel?.can?.add_to) {
      await addIndividualCollaborator(await directoryToken(token), channel.id, person.id);
      memberChannel = await client.item("Channel", channel.id);
      if (!memberChannel.can?.add_to) throw new Error("Are.na has not granted you access to your profile channel yet. Try again shortly.");
    }
    // Re-read after each retry; successfully created blocks keep their connection roles.
    const contents = await client.contents(channel.id, 1, 100);
    if (contents.meta.has_more_pages) throw new Error("This profile has too many items to edit safely. Remove unrelated items on Are.na first.");
    const items = contents.data;
    const upsert = async (role: string, title: string, value: string) => {
      const existing = items.find(x => roleOf(x) === role || (role === "details" && x.type === "Text" && x.title === "details"));
      if (!existing) return client.createBlock(channel.id, title, value, role);
      if (existing.user?.id !== person.id) throw new Error("A managed block is owned by a different account. Restore it on Are.na before editing.");
      return client.updateBlock(existing.id, { title, ...(existing.type === "Text" ? { content: value } : {}) });
    };
    await upsert("profile_link", person.name, `https://www.are.na/${person.slug}`);
    await upsert("biography", "Who are you?", input.whoAreYou);
    await upsert("description", "What you’re looking for", input.lookingFor);
    await upsert("details", "details", serializeDetails(input.details));
    await savePhoto(client, person, channel.id, input, items);
    const oldSelections = items.filter(x => roleOf(x) === "selected");
    const oldDescriptions = items.filter(x => roleOf(x) === "selected_description");
    for (let i = 0; i < input.selected.length; i++) {
      const selected = input.selected[i]; const key = `${selected.type}:${selected.id}`;
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
    for (const previous of oldSelections) if (!input.selected.some(x => `${x.type}:${x.id}` === itemKey(previous)) && previous.connection) await client.disconnect(previous.connection.id);
    for (const previous of oldDescriptions) if (!input.selected.some(x => `${x.type}:${x.id}` === descriptionRef(previous) && x.description) && previous.connection) await client.disconnect(previous.connection.id);
    // Move each pair to the end in display order. This also keeps descriptions
    // adjacent after replacement, reordering, and retries of partial writes.
    const arranged = await client.contents(channel.id, 1, 100);
    if (arranged.meta.has_more_pages) throw new Error("This profile has too many items to order safely.");
    for (const selected of input.selected) {
      const key = `${selected.type}:${selected.id}`;
      const pair = [arranged.data.find(x => roleOf(x) === "selected" && itemKey(x) === key), arranged.data.find(x => roleOf(x) === "selected_description" && descriptionRef(x) === key)];
      for (const item of pair) if (item?.connection) await client.request(`/connections/${item.connection.id}`, { method: "PUT", body: { position: arranged.data.length } });
    }
    await manager.updateChannel(channel.id, { title: person.name, metadata: { published: true } });
    if (!ref.published) {
      const parents = await manager.request<import("./types").Page<Item>>(`/channels/${channel.id}/connections?per=100`);
      if (!parents.data.some(x => x.id === directory.id)) await manager.connect(directory.id, { id: channel.id, type: "Channel" }, { app: "connections", role: "profile", profile_user_id: person.id });
      publishProfile(person.id);
    }
    return { channelId: channel.id };
  });
}
async function savePhoto(client: ArenaClient, person: Person, channel: number, input: z.infer<typeof profileInputSchema>, items: Item[]) {
  const old = items.filter(x => roleOf(x) === "photo");
  if (input.photoKey) {
    const upload = database().prepare("SELECT * FROM uploads WHERE key=? AND user_id=? AND expires>?").get(input.photoKey, person.id, Date.now());
    if (!upload) throw new Error("The photo upload expired. Please select your photo again.");
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
