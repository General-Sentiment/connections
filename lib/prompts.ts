import { ArenaClient } from "./arena";
import { allItems } from "./arena-discovery";
export type ProfilePrompt = { id: number; text: string; addedAt?: string; addedBy?: { name: string; slug: string }; author?: { name: string; slug: string } };
const cache = new Map<string, { value: ProfilePrompt[]; expires: number }>();
const pending = new Map<string, Promise<ProfilePrompt[]>>();
export function invalidatePromptCache() { cache.clear(); pending.clear(); }
export const resetPromptCacheForTests = invalidatePromptCache;
export async function profilePrompts(): Promise<ProfilePrompt[]> {
  const channel = process.env.ARENA_PROMPTS_CHANNEL || "prompts-lkiimgy92_0";
  const cached = cache.get(channel);
  if (cached && cached.expires > Date.now()) return structuredClone(cached.value);
  let request = pending.get(channel);
  if (!request) {
    request = loadPrompts(channel).then(value => {
      cache.clear();
      cache.set(channel, { value, expires: Date.now() + 5 * 60 * 1000 });
      return value;
    }).finally(() => pending.delete(channel));
    pending.set(channel, request);
  }
  return structuredClone(await request);
}
async function loadPrompts(channel: string): Promise<ProfilePrompt[]> {
  const items = await allItems(new ArenaClient(undefined, false), `/channels/${encodeURIComponent(channel)}/contents?sort=position_desc`);
  return items.filter(item => item.type === "Text" && item.state === "available" && item.visibility !== "private")
    .map(item => ({ id: item.id, text: (item.content?.plain || item.content?.markdown || item.title || "").trim(), addedAt: item.connection?.connected_at || item.created_at, ...(item.connection?.connected_by?.name && item.connection.connected_by.slug ? { addedBy: { name: item.connection.connected_by.name, slug: item.connection.connected_by.slug } } : {}), ...(item.user?.name && item.user.slug ? { author: { name: item.user.name, slug: item.user.slug } } : {}) }))
    .filter(prompt => prompt.text.length > 0 && prompt.text.length <= 2000);
}
