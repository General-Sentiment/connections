import { ArenaClient, ArenaError } from "./arena";
import { publicArenaCache, arenaCacheGeneration } from "./arena-requests";
import { allItems } from "./arena-discovery";
import { readProfile } from "./profiles";
import type { Profile } from "./types";

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
// Share one paced queue across simultaneous /match visits in this server process.
const shared = globalThis as typeof globalThis & { matchReads?: { tail: Promise<unknown>; next: number; loads: Map<number, Promise<{ profiles: Profile[]; skipped: number }>> } };
const state = shared.matchReads ??= { tail: Promise.resolve(), next: 0, loads: new Map() };
type Snapshot = { profiles: Profile[]; skipped: number; expires: number; generation: number };
const snapshotGlobal = globalThis as typeof globalThis & { matchSnapshots?: Map<number, Snapshot> };
const snapshots = snapshotGlobal.matchSnapshots ??= new Map<number, Snapshot>();
export class MatchReadClient extends ArenaClient {
  override request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
    const read = !options.method || options.method === "GET";
    const cached = read ? publicArenaCache<T>(path) : undefined;
    if (cached) return Promise.resolve(cached.value);
    const operation = state.tail.then(async () => {
      const queuedCache = read ? publicArenaCache<T>(path) : undefined;
      if (queuedCache) return queuedCache.value;
      for (let attempt = 0; ; attempt++) {
        await sleep(Math.max(0, state.next - Date.now()));
        state.next = Date.now() + 1100;
        try { return await super.request<T>(path, options); }
        catch (error) {
          if (!(error instanceof ArenaError) || error.status !== 429 || attempt >= 3) throw error;
          const seconds = Number(error.retryAfter);
          // Arena's request layer normalizes Retry-After (including HTTP dates).
          state.next = Date.now() + (Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 60000) + 250;
        }
      }
    });
    state.tail = operation.catch(() => undefined);
    return operation;
  }
}
export function loadMatchProfiles(group: number, onProgress?: (loaded: number, total: number) => void) {
  const snapshot = snapshots.get(group);
  if (snapshot && snapshot.expires > Date.now() && snapshot.generation === arenaCacheGeneration()) {
    onProgress?.(snapshot.profiles.length + snapshot.skipped, snapshot.profiles.length + snapshot.skipped);
    return Promise.resolve({ profiles: snapshot.profiles, skipped: snapshot.skipped });
  }
  const generation = arenaCacheGeneration();
  const pending = state.loads.get(group);
  if (pending) return pending;
  const operation = (async () => {
    const client = new MatchReadClient();
    const channels = (await allItems(client, `/groups/${group}/contents?type=Channel`)).filter(item => item.type === "Channel" && item.visibility !== "private" && item.owner?.type === "Group" && item.owner.id === group && item.metadata?.app === "connections" && item.metadata.published === true && item.metadata.hidden !== true);
    const profiles: Profile[] = []; let skipped = 0;
    onProgress?.(0, channels.length);
    for (const item of channels) {
      try {
        const profile = await readProfile(item.id, client, item);
        if (profile.warning) skipped++;
        else profiles.push(profile);
      } catch (error) {
        // Removed/private profiles may disappear mid-scan. Transient failures must
        // fail the load rather than silently match against an incomplete pool.
        if (error instanceof ArenaError && (error.status === 404 || error.status === 403)) skipped++;
        else throw error;
      }
      onProgress?.(profiles.length + skipped, channels.length);
    }
    if (generation === arenaCacheGeneration()) snapshots.set(group, { profiles, skipped, generation, expires: Date.now() + 60000 });
    return { profiles, skipped };
  })();
  state.loads.set(group, operation);
  void operation.finally(() => { if (state.loads.get(group) === operation) state.loads.delete(group); }).catch(() => undefined);
  return operation;
}
