import { createHash } from "node:crypto";
export class ArenaError extends Error {
  constructor(public status: number, message: string, public retryAfter?: string) { super(message); }
}
type Cached = { value: unknown; expires: number };
const globalState = globalThis as typeof globalThis & { arenaRequests?: ReturnType<typeof createState> };
function createState() { return { cache: new Map<string, Cached>(), pending: new Map<string, Promise<unknown>>(), cooldowns: new Map<string, number>(), generation: 0, active: 0, queue: [] as (() => void)[] }; }
const state = globalState.arenaRequests ??= createState();
async function slot() {
  if (state.active >= 3) await new Promise<void>(resolve => state.queue.push(resolve));
  else state.active++;
  return () => { const next = state.queue.shift(); if (next) next(); else state.active--; };
}
function rateError(until: number) { const seconds = Math.max(1, Math.ceil((until - Date.now()) / 1000)); return new ArenaError(429, `Are.na needs a short pause. Please try again in ${seconds} seconds.`, String(seconds)); }
export async function arenaRequest<T>(path: string, token: string | undefined, options: { method?: string; body?: unknown }, cachePublic = true): Promise<T> {
  const method = options.method || "GET"; const read = method === "GET";
  const scope = token ? createHash("sha256").update(token).digest("hex") : "public";
  const key = `${scope}:${path}`; const cacheable = read && !token && cachePublic;
  const cached = cacheable ? state.cache.get(key) : undefined;
  if (cached && cached.expires > Date.now()) return structuredClone(cached.value) as T;
  if (cached) state.cache.delete(key);
  const pendingKey = `${key}:${cachePublic}`;
  if (read && state.pending.has(pendingKey)) return structuredClone(await state.pending.get(pendingKey)) as T;
  const run = async () => {
    const release = await slot();
    const generation = state.generation;
    try {
      const until = state.cooldowns.get(scope) || 0;
      if (until > Date.now()) throw rateError(until);
      state.cooldowns.delete(scope);
      const response = await fetch(`https://api.are.na/v3${path}`, { method, cache: "no-store", signal: AbortSignal.timeout(20000), headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.body ? { "Content-Type": "application/json" } : {}) }, body: options.body ? JSON.stringify(options.body) : undefined });
      if (response.status === 429) {
        const retry = response.headers.get("Retry-After");
        const retryDate = retry && /^\d+(\.\d+)?$/.test(retry) ? Date.now() + Number(retry) * 1000 : Date.parse(retry || "");
        const reset = Number(response.headers.get("X-RateLimit-Reset")) * 1000;
        const until = Math.max(Date.now() + 1000, Number.isFinite(retryDate) ? retryDate : reset > Date.now() ? reset : Date.now() + 60000);
        state.cooldowns.set(scope, until); throw rateError(until);
      }
      if (!response.ok) {
        const messages: Record<number, string> = { 401: "Your Are.na session has expired. Log in again.", 403: "Are.na did not allow this action. Check your account plan and channel permissions.", 404: "This Are.na item is unavailable or private." };
        throw new ArenaError(response.status, messages[response.status] || `Are.na could not complete this request (${response.status}).`);
      }
      if (!read) { state.generation++; state.cache.clear(); }
      if (response.status === 204) return undefined;
      const value = await response.json();
      const control = response.headers.get("Cache-Control") || "";
      const seconds = Math.min(300, Number(control.match(/(?:^|[,\s])max-age=(\d+)/i)?.[1] || 60));
      if (cacheable && !/no-store|no-cache|private/i.test(control) && generation === state.generation) {
        if (state.cache.size >= 300) state.cache.delete(state.cache.keys().next().value!);
        state.cache.set(key, { value: structuredClone(value), expires: Date.now() + seconds * 1000 });
      }
      return value;
    } finally { release(); }
  };
  const operation = run();
  if (read) state.pending.set(pendingKey, operation);
  try { return structuredClone(await operation) as T; }
  finally { if (read && state.pending.get(pendingKey) === operation) state.pending.delete(pendingKey); }
}
export function resetArenaRequestsForTests() { state.cache.clear(); state.pending.clear(); state.cooldowns.clear(); state.generation++; }
