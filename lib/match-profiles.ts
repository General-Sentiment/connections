import { ArenaClient, ArenaError } from "./arena";
import { publicArenaCache, arenaCacheGeneration } from "./arena-requests";
import { allItems } from "./arena-discovery";
import { assembleProfile } from "./profiles";
import type { Profile, Person } from "./types";

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
// Share one paced queue across simultaneous /pair visits in this server process.
const shared = globalThis as typeof globalThis & { matchReads?: { tail: Promise<unknown>; next: number; loads: Map<string | number, Promise<{ profiles: Profile[]; skipped: number }>> } };
const state = shared.matchReads ??= { tail: Promise.resolve(), next: 0, loads: new Map() };
type Snapshot = { profiles: Profile[]; skipped: number; expires: number; generation: number };
const snapshotGlobal = globalThis as typeof globalThis & { matchSnapshotsV2?: Map<string | number, Snapshot> };
const snapshots = snapshotGlobal.matchSnapshotsV2 ??= new Map<string | number, Snapshot>();
type ProgressListener = (loaded: number, total: number, message?: string) => void;
const progressGlobal = globalThis as typeof globalThis & { pairProgress?: Map<string | number, { loaded: number; total: number; message?: string; listeners: Set<ProgressListener> }> };
const progressState = progressGlobal.pairProgress ??= new Map();
export class MatchReadClient extends ArenaClient {
  constructor(private matchToken?: string, private onPause?: (message: string) => void) { super(matchToken); }
  override request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
    const read = !options.method || options.method === "GET";
    const cached = read ? publicArenaCache<T>(path) : undefined;
    if (cached) return Promise.resolve(cached.value);
    const operation = state.tail.then(async () => {
      const queuedCache = read ? publicArenaCache<T>(path) : undefined;
      if (queuedCache) return queuedCache.value;
      for (let attempt = 0; ; attempt++) {
        await sleep(Math.max(0, state.next - Date.now()));
        state.next = Date.now() + (this.matchToken ? 600 : 2200);
        try { return await super.request<T>(path, options); }
        catch (error) {
          if (!(error instanceof ArenaError) || error.status !== 429 || attempt >= 3) throw error;
          const seconds = Number(error.retryAfter);
          // Arena's request layer normalizes Retry-After (including HTTP dates).
          this.onPause?.(`Are.na rate limit reached. Waiting ${Number.isFinite(seconds) && seconds > 0 ? seconds : 60} seconds before retrying…`);
          state.next = Date.now() + (Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 60000) + 250;
        }
      }
    });
    state.tail = operation.catch(() => undefined);
    return operation;
  }
}
export function loadMatchProfiles(group: number, onProgress?: ProgressListener, token?: string, sourceChannel?: string) {
  const key = sourceChannel ? `attendees:${group}:${sourceChannel}` : group;
  const snapshot = snapshots.get(key);
  if (snapshot && snapshot.expires > Date.now() && snapshot.generation === arenaCacheGeneration()) {
    onProgress?.(snapshot.profiles.length + snapshot.skipped, snapshot.profiles.length + snapshot.skipped);
    return Promise.resolve({ profiles: snapshot.profiles, skipped: snapshot.skipped });
  }
  const generation = arenaCacheGeneration();
  const pending = state.loads.get(key);
  if (pending) {
    const current = progressState.get(key);
    if (current && onProgress) {
      current.listeners.add(onProgress);
      onProgress(current.loaded, current.total, current.message);
      return pending.finally(() => current.listeners.delete(onProgress));
    }
    return pending;
  }
  const current = { loaded: 0, total: 0, message: "Finding published profiles…", listeners: new Set<ProgressListener>(onProgress ? [onProgress] : []) };
  progressState.set(key, current);
  const report: ProgressListener = (loaded, total, message) => {
    Object.assign(current, { loaded, total, message });
    for (const listener of current.listeners) listener(loaded, total, message);
  };
  report(0, 0, "Finding published profiles…");
  const operation = (async () => {
    const client = new MatchReadClient(token, message => report(current.loaded, current.total, message));
    const channels = (await allItems(client, sourceChannel ? `/channels/${encodeURIComponent(sourceChannel)}/contents?type=Channel` : `/groups/${group}/contents?type=Channel`)).filter(item => item.type === "Channel" && item.visibility !== "private" && item.owner?.type === "Group" && item.owner.id === group && item.metadata?.app === "connections" && item.metadata.published === true && item.metadata.hidden !== true);
    const profiles: Profile[] = []; let skipped = 0;
    report(0, channels.length);
    for (const item of channels) {
      try {
        const contents = (await allItems(client, `/channels/${item.id}/contents`)).filter(block => block.visibility !== "private" && block.state === "available");
        const id = Number(item.metadata?.profile_user_id);
        const embedded = contents.flatMap(block => [block.user, block.connection?.connected_by]).find((person): person is Person => person?.type === "User" && person.id === id);
        // Pairing links to the profile channel; no separate account lookup is needed.
        const person: Person = embedded || { id, type: "User", name: item.title || "Profile", slug: "" };
        const profile = assembleProfile(item, contents, person);
        // Pairing needs preferences, names and photos, not the full collection payload.
        profile.selected = [];
        profile.selectedDescriptions = {};
        // Invalid details become blank preferences in assembleProfile. Keep the
        // person available for a general introduction rather than dropping them.
        profiles.push(profile);
      } catch (error) {
        // Removed/private profiles may disappear mid-scan. Transient failures must
        // fail the load rather than silently match against an incomplete pool.
        if (error instanceof ArenaError && (error.status === 404 || error.status === 403)) skipped++;
        else throw error;
      }
      report(profiles.length + skipped, channels.length);
    }
    if (generation === arenaCacheGeneration()) snapshots.set(key, { profiles, skipped, generation, expires: Date.now() + 60000 });
    return { profiles, skipped };
  })();
  state.loads.set(key, operation);
  void operation.finally(() => { if (state.loads.get(key) === operation) { state.loads.delete(key); progressState.delete(key); } }).catch(() => undefined);
  return operation;
}
