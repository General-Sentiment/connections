// Best-effort coordination inside one worker only. Are.na metadata is the
// durable source of truth; this is not a cross-instance uniqueness guarantee.
const runtime = globalThis as typeof globalThis & { connectionsLocks?: Set<string> };
const locks = runtime.connectionsLocks ??= new Set<string>();
export async function withLock<T>(key: string, action: () => Promise<T>): Promise<T> {
  if (locks.has(key)) throw new Error("This change is already being saved. Please wait before trying again.");
  locks.add(key);
  try { return await action(); } finally { locks.delete(key); }
}
export const pairKey = (a: number, b: number) => [a, b].sort((x, y) => x - y).join(":");
