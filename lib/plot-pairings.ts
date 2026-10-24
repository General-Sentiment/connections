import { assignPlotChairs } from "./plot-chairs";
import { z } from "zod";
import { parseDocument, stringify } from "yaml";
import { unstable_cache } from "next/cache";
import { ArenaClient, ArenaError } from "./arena";
import { allItems } from "./arena-discovery";
import { directoryClient, directoryToken } from "./directory-auth";
import { groupId } from "./config";
import { loadMatchProfiles } from "./match-profiles";
import { pairEveryone, matchKey } from "./matching";
import { readProfile, availableProfileRef } from "./profiles";
import { safeUrl } from "./urls";
import { withLock } from "./coordination";

export const plotChannel = () => process.env.ARENA_PLOT_CHANNEL || "plot-kijbdhlt3gy";
const member = z.object({ user_id: z.number().int().positive(), profile_id: z.number().int().positive(), name: z.string().max(300), chair: z.number().int().min(1).max(20).optional(), photo: z.string().url().nullable().optional() }).strict();
export const plotRunSchema = z.object({
  schema: z.literal("plot_pairings"), version: z.literal(1), created_at: z.string(), created_by: z.number().int().positive(),
  settings: z.object({ answeredActivePromptOnly: z.boolean().optional(), checkedInOnly: z.boolean().optional(), location: z.enum(["city", "state", "country"]).optional(), romantic: z.boolean(), romanticPreferences: z.boolean() }),
  pairs: z.array(z.object({ first: member, second: member, shared: z.array(z.string()), note: z.string().optional() }).strict()).max(5000),
  unpaired: z.array(member),
  unavailable_profiles: z.number().int().nonnegative().optional(),
}).strict();
export const plotModes = ["inactive", "ready", "pairing", "prompt"] as const;
export type PlotMode = typeof plotModes[number];
export const plotStateSchema = z.object({ schema: z.literal("plot_state"), version: z.literal(1), mode: z.enum(plotModes).optional(), active_prompt: z.enum(["one", "two"]).optional(), active_run_id: z.number().int().positive().nullable(), updated_at: z.string() }).strict();
export function parsePlotYaml<T>(content: string, schema: z.ZodType<T>): T {
  if (content.length > 2000000) throw new Error("Plot data is too large.");
  const match = content.trim().match(/^```ya?ml\s*\n([\s\S]*?)\n```$/i);
  const document = parseDocument(match ? match[1] : content, { uniqueKeys: true });
  if (document.errors.length) throw new Error("Plot data contains invalid YAML.");
  return schema.parse(document.toJS({ maxAliasCount: 0 }));
}
export const plotYaml = (data: unknown) => "```yaml\n" + stringify(data, { lineWidth: 0 }) + "```";
export async function plotPublisher(token: string) {
  const channel = await new ArenaClient(token).item("Channel", plotChannel());
  if (!channel.can?.update) throw new ArenaError(403, "Only an event channel editor can publish pairings.");
  if (channel.visibility === "private") throw new ArenaError(400, "The Plot channel must be publicly readable for attendee updates.");
  return channel;
}
export const plotAttendeesChannel = () => process.env.ARENA_PLOT_ATTENDEES_CHANNEL || "plot-attendees";
export function checkedInUsers(items: import("./types").Item[]) {
  return new Set(items.filter(item => item.type === "Channel" && item.visibility !== "private" && item.metadata?.app === "connections" && item.metadata?.published === true && item.metadata?.hidden !== true).map(item => Number(item.metadata?.profile_user_id)).filter(id => Number.isSafeInteger(id) && id > 0));
}
const readPlotItems = unstable_cache(async (channel: string) => allItems(new ArenaClient(await directoryToken("") || undefined, false), `/channels/${encodeURIComponent(channel)}/contents`), ["plot-event-items-v1"], { revalidate: 15, tags: ["plot-pairings"] });
const readAttendees = unstable_cache(async (channel: string) => allItems(new ArenaClient(await directoryToken("") || undefined, false), `/channels/${encodeURIComponent(channel)}/contents?type=Channel`), ["plot-attendee-channels-v1"], { revalidate: 15, tags: ["plot-pairings"] });
function modeOf(items: import("./types").Item[]): PlotMode {
  const blocks = items.filter(item => item.type === "Text" && item.title === "state");
  if (blocks.length > 1) throw new Error("The Plot channel must have exactly one state block.");
  if (!blocks.length) return "ready";
  const state = parsePlotYaml(blocks[0].content?.markdown || "", plotStateSchema);
  return state.mode ?? (state.active_run_id ? "pairing" : "ready");
}
export async function readPlotMode(): Promise<PlotMode> {
  return modeOf(await readPlotItems(plotChannel()));
}
export async function readActivePlotPrompt(): Promise<"one" | "two"> {
  const items = await readPlotItems(plotChannel());
  const block = items.find(item => item.type === "Text" && item.title === "state");
  return block ? parsePlotYaml(block.content?.markdown || "", plotStateSchema).active_prompt ?? "one" : "one";
}
export function pinnedPrompt(items: import("./types").Item[]) {
  const pinned = items.filter(item => item.type === "Text" && item.connection?.pinned && item.visibility !== "private" && item.state === "available");
  if (pinned.length !== 1) throw new Error("Pin exactly one text block in the active prompt channel.");
  const block = pinned[0];
  const text = (block.content?.markdown || block.content?.plain || "").trim();
  if (!text) throw new Error("The pinned prompt text is empty.");
  return { id: block.id, text, revision: `${block.id}:${block.updated_at}` };
}
const readPlotPromptItems = unstable_cache(async (active: "one" | "two") => {
  const channel = active === "one" ? "plot-prompt-one" : "plot-prompt-two";
  return allItems(new ArenaClient(await directoryToken("") || undefined, false), `/channels/${channel}/contents`);
}, ["plot-prompt-items-v1"], { revalidate: 15, tags: ["plot-pairings", "plot-profile-answers"] });
export async function readPlotPrompt(active: "one" | "two") { return pinnedPrompt(await readPlotPromptItems(active)); }
export function plotPromptResponses(items: import("./types").Item[]) {
  const prompt = pinnedPrompt(items);
  const answers = items.filter(item => item.id !== prompt.id && !item.connection?.pinned && item.visibility !== "private" && item.state === "available").map(item => ({ item, author: item.connection?.connected_by?.name || item.user?.name || "" }));
  return { answers, revision: answers.map(answer => `${answer.item.type}:${answer.item.id}:${answer.item.updated_at}:${answer.item.connection?.id || ""}`).join("|") };
}
export function plotPromptRespondents(items: import("./types").Item[]) {
  const { answers } = plotPromptResponses(items);
  return new Set(answers.map(({ item }) => Number(item.connection?.connected_by?.id)).filter(id => Number.isSafeInteger(id) && id > 0));
}
export async function readPlotPromptResponses(active: "one" | "two") { return plotPromptResponses(await readPlotPromptItems(active)); }
export async function setPlotPrompt(token: string, activePrompt: "one" | "two") {
  const channel = await plotPublisher(token);
  await readPlotPrompt(activePrompt);
  return withLock(`plot-pairings:${channel.id}`, async () => {
    const manager = await directoryClient(token);
    const items = await allItems(manager, `/channels/${channel.id}/contents`);
    const mode = modeOf(items);
    const block = items.find(item => item.type === "Text" && item.title === "state");
    const previous = block ? parsePlotYaml(block.content?.markdown || "", plotStateSchema) : { schema: "plot_state", version: 1, active_run_id: null };
    const content = plotYaml({ ...previous, mode, active_prompt: activePrompt, updated_at: new Date().toISOString() });
    if (block) await manager.updateBlock(block.id, { content });
    else await manager.createBlock(channel.id, "state", content, "plot_state");
    return { activePrompt };
  });
}
function promptOf(items: import("./types").Item[]) {
  const block = items.find(item => item.type === "Text" && item.title === "state");
  return block ? parsePlotYaml(block.content?.markdown || "", plotStateSchema).active_prompt ?? "one" : "one";
}
export async function setPlotMode(token: string, mode: PlotMode) {
  const channel = await plotPublisher(token);
  return withLock(`plot-pairings:${channel.id}`, async () => {
    const manager = await directoryClient(token);
    const items = await allItems(manager, `/channels/${channel.id}/contents`);
    modeOf(items);
    const block = items.find(item => item.type === "Text" && item.title === "state");
    const previous = block ? parsePlotYaml(block.content?.markdown || "", plotStateSchema) : { schema: "plot_state", version: 1, active_run_id: null };
    const content = plotYaml({ ...previous, mode, updated_at: new Date().toISOString() });
    if (block) await manager.updateBlock(block.id, { content });
    else await manager.createBlock(channel.id, "state", content, "plot_state");
    return { mode };
  });
}
export async function plotAttendance(userId: number) {
  return checkedInUsers(await readAttendees(plotAttendeesChannel())).has(userId);
}
export async function checkInToPlot(token: string, userId: number) {
  return withLock(`plot-checkin:${plotAttendeesChannel()}:${userId}`, async () => {
    const profile = await availableProfileRef(userId, new ArenaClient(token));
    if (!profile?.published) throw new ArenaError(400, "Create your profile before checking in.");
    const manager = await directoryClient(token);
    const channel = await manager.item("Channel", plotAttendeesChannel());
    const items = await allItems(manager, `/channels/${channel.id}/contents?type=Channel`);
    if (!items.some(item => item.type === "Channel" && item.id === profile.channel_id)) {
      await manager.connect(channel.id, { id: profile.channel_id, type: "Channel" }, { app: "connections", role: "plot_attendee" });
    }
    return { checkedIn: true };
  });
}
export async function checkOutOfPlot(token: string, userId: number) {
  return withLock(`plot-checkin:${plotAttendeesChannel()}:${userId}`, async () => {
    const manager = await directoryClient(token);
    const items = await allItems(manager, `/channels/${encodeURIComponent(plotAttendeesChannel())}/contents?type=Channel`);
    const ownProfiles = items.filter(item => item.type === "Channel" && item.metadata?.app === "connections" && Number(item.metadata.profile_user_id) === userId);
    for (const profile of ownProfiles) {
      if (!profile.connection?.id) throw new ArenaError(502, "Your check-in could not be removed. Try again.");
      await manager.disconnect(profile.connection.id);
    }
    return { checkedIn: false };
  });
}
// One shared public read per revalidation window, rather than one scan per attendee.
export const readPlotRound = unstable_cache(async (channel: string) => {
  const items = await readPlotItems(channel);
  const states = items.filter(item => item.type === "Text" && item.title === "state");
  if (!states.length) return null;
  if (states.length !== 1) throw new Error("The Plot channel must have exactly one state block.");
  const state = parsePlotYaml(states[0].content?.markdown || "", plotStateSchema);
  if (state.active_run_id === null) return null;
  const block = items.find(item => item.type === "Text" && item.id === state.active_run_id);
  if (!block) throw new Error("The active pairing run is missing from the Plot channel.");
  return { id: block.id, ...parsePlotYaml(block.content?.markdown || "", plotRunSchema) };
}, ["plot-active-round-v1"], { revalidate: 15, tags: ["plot-pairings"] });

export const publishPlotInput = z.object({ answeredActivePromptOnly: z.boolean().default(true), checkedInOnly: z.boolean().default(true), location: z.enum(["city", "state", "country"]).optional(), romantic: z.boolean().default(false), romanticPreferences: z.boolean().default(true) }).strict();
export async function publishPlotRound(token: string, userId: number, rawInput: z.input<typeof publishPlotInput>) {
  const input = publishPlotInput.parse(rawInput);
  const channel = await plotPublisher(token);
  return withLock(`plot-pairings:${channel.id}`, async () => {
    if (!groupId()) throw new Error("The directory is not configured.");
    const manager = await directoryClient(token);
    const items = await allItems(manager, `/channels/${channel.id}/contents`);
    const states = items.filter(item => item.type === "Text" && item.title === "state");
    if (states.length > 1) throw new Error("The Plot channel must have exactly one state block.");
    if (states[0]) parsePlotYaml(states[0].content?.markdown || "", plotStateSchema);
    const previous = items.filter(item => item.type === "Text" && item.metadata?.role === "plot_pairings");
    const history = previous.map(item => parsePlotYaml(item.content?.markdown || "", plotRunSchema));
    const seen = new Set(history.flatMap(run => run.pairs.map(pair => matchKey(pair.first.user_id, pair.second.user_id))));
    const answered = input.answeredActivePromptOnly ? plotPromptRespondents(await allItems(manager, `/channels/plot-prompt-${promptOf(items)}/contents`)) : null;
    const loaded: { profiles: import("./types").Profile[]; skipped: number } = await loadMatchProfiles(groupId()!, undefined, token);
    const profiles = loaded.profiles.filter(profile => !answered || answered.has(profile.person.id));
    const skipped = loaded.skipped;
    if (profiles.length < 2) throw new Error(input.answeredActivePromptOnly ? "At least two people with readable profiles must answer the active prompt before publishing a round." : "At least two readable profiles are needed to publish a round.");
    const result = pairEveryone(profiles, input.location, { ...input, seen });
    const ref = (profile: typeof profiles[number]) => ({ user_id: profile.person.id, profile_id: profile.channel.id, name: profile.person.name, photo: safeUrl(profile.photo?.image?.medium?.src || profile.photo?.image?.src || profile.person.avatar) || null });
    const run = plotRunSchema.parse({ schema: "plot_pairings", version: 1, created_at: new Date().toISOString(), created_by: userId, settings: { ...input, checkedInOnly: false },
      unavailable_profiles: skipped, pairs: assignPlotChairs(result.pairs.map(pair => ({ first: ref(pair.first), second: ref(pair.second), shared: pair.shared, ...(pair.fallback ? { note: pair.fallback } : {}) })), history), unpaired: result.unpaired.map(ref) });
    const block = await manager.createBlock(channel.id, `Pairings · ${run.created_at}`, plotYaml(run), "plot_pairings");
    // Publish the pointer last: readers never see a partially written run.
    const state = plotYaml({ schema: "plot_state", version: 1, active_prompt: promptOf(items), mode: modeOf(items), active_run_id: block.id, updated_at: new Date().toISOString() });
    if (states[0]) await manager.updateBlock(states[0].id, { content: state });
    else await manager.createBlock(channel.id, "state", state, "plot_state");
    return { runId: block.id, ...result, skipped };
  });
}

export async function listPlotRuns(token: string) {
  const channel = await plotPublisher(token);
  const items = await allItems(new ArenaClient(token, false), `/channels/${channel.id}/contents`);
  const states = items.filter(item => item.type === "Text" && item.title === "state");
  if (states.length > 1) throw new Error("The Plot channel must have exactly one state block.");
  const activeRunId = states[0] ? parsePlotYaml(states[0].content?.markdown || "", plotStateSchema).active_run_id : null;
  const runs = items.filter(item => item.type === "Text" && item.metadata?.role === "plot_pairings").map(item => {
    const run = parsePlotYaml(item.content?.markdown || "", plotRunSchema);
    return { id: item.id, title: item.title, createdAt: run.created_at, pairCount: run.pairs.length };
  }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id);
  const activeBlock = items.find(item => item.id === activeRunId);
  const activeRound = activeBlock ? parsePlotYaml(activeBlock.content?.markdown || "", plotRunSchema) : null;
  const activePairs = activeRound?.pairs ?? [];
  return { activePairs, activeSettings: activeRound?.settings, activePrompt: promptOf(items), mode: modeOf(items), activeRunId, runs };
}
export async function selectPlotRun(token: string, runId: number) {
  const channel = await plotPublisher(token);
  return withLock(`plot-pairings:${channel.id}`, async () => {
    const manager = await directoryClient(token);
    const items = await allItems(manager, `/channels/${channel.id}/contents`);
    const run = items.find(item => item.id === runId && item.type === "Text" && item.metadata?.role === "plot_pairings");
    if (!run) throw new ArenaError(404, "This pairing run does not belong to the Plot event channel.");
    parsePlotYaml(run.content?.markdown || "", plotRunSchema);
    const states = items.filter(item => item.type === "Text" && item.title === "state");
    if (states.length > 1) throw new Error("The Plot channel must have exactly one state block.");
    if (states[0]) parsePlotYaml(states[0].content?.markdown || "", plotStateSchema);
    const state = plotYaml({ schema: "plot_state", version: 1, active_prompt: promptOf(items), mode: modeOf(items), active_run_id: runId, updated_at: new Date().toISOString() });
    if (states[0]) await manager.updateBlock(states[0].id, { content: state });
    else await manager.createBlock(channel.id, "state", state, "plot_state");
    return { activeRunId: runId };
  });
}

export async function deletePlotRun(token: string, runId?: number) {
  const channel = await plotPublisher(token);
  return withLock(`plot-pairings:${channel.id}`, async () => {
    const manager = await directoryClient(token);
    const items = await allItems(manager, `/channels/${channel.id}/contents`);
    const states = items.filter(item => item.type === "Text" && item.title === "state");
    if (states.length > 1) throw new Error("The Plot channel must have exactly one state block.");
    const activeRunId = states[0] ? parsePlotYaml(states[0].content?.markdown || "", plotStateSchema).active_run_id : null;
    const runs = items.filter(item => item.type === "Text" && item.metadata?.role === "plot_pairings" && (runId === undefined || item.id === runId));
    if (runId !== undefined && !runs.length) throw new ArenaError(404, "This round is not connected to the Plot event channel.");
    if (runs.some(run => !run.connection)) throw new Error("A round is missing its event connection.");
    const clearActive = runId === undefined || activeRunId === runId;
    // Clear the pointer before disconnecting its target so readers see a valid state.
    if (clearActive) {
      const state = plotYaml({ schema: "plot_state", version: 1, active_prompt: promptOf(items), mode: modeOf(items) === "pairing" ? "ready" : modeOf(items), active_run_id: null, updated_at: new Date().toISOString() });
      if (states[0]) await manager.updateBlock(states[0].id, { content: state });
      else await manager.createBlock(channel.id, "state", state, "plot_state");
    }
    for (const run of runs) await manager.disconnect(run.connection!.id);
    return { deletedRunIds: runs.map(run => run.id), activeRunId: clearActive ? null : activeRunId, mode: clearActive && modeOf(items) === "pairing" ? "ready" : modeOf(items) };
  });
}

export const readPlotPartnerPhoto = unstable_cache(async (profileId: number) => {
  const profile = await readProfile(profileId, new ArenaClient(await directoryToken("") || undefined));
  if (profile.channel.metadata?.hidden === true || profile.channel.metadata?.published !== true) return null;
  return safeUrl(profile.photo?.image?.medium?.src || profile.photo?.image?.src || profile.person.avatar) || null;
}, ["plot-partner-photo-v1"], { revalidate: 3600 });

export function profilePromptAnswers(profile: import("./types").Profile) {
  return profile.selected.flatMap(item => {
    const key = `${item.type === "Channel" ? "Channel" : "Block"}:${item.id}`;
    const prompt = profile.details.selected_prompts?.[key];
    return prompt ? [{ item, prompt, description: profile.selectedDescriptions?.[key] || "" }] : [];
  });
}
export const readPlotPartnerAnswers = unstable_cache(async (profileId: number) => {
  const profile = await readProfile(profileId, new ArenaClient(await directoryToken("") || undefined));
  if (profile.channel.metadata?.hidden === true || profile.channel.metadata?.published !== true) return [];
  return profilePromptAnswers(profile);
}, ["plot-partner-answers-v1"], { revalidate: 60, tags: ["plot-profile-answers"] });
