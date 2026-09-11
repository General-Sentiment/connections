import { ArenaClient } from "./arena";
import { allItems } from "./arena-discovery";
export type ProfilePrompt = { id: number; text: string; author?: { name: string; slug: string } };
export async function profilePrompts(): Promise<ProfilePrompt[]> {
  const items = await allItems(new ArenaClient(undefined, false), `/channels/${encodeURIComponent(process.env.ARENA_PROMPTS_CHANNEL || "prompts-lkiimgy92_0")}/contents?sort=position_desc`);
  return items.filter(item => item.type === "Text" && item.state === "available" && item.visibility !== "private")
    .map(item => ({ id: item.id, text: (item.content?.plain || item.content?.markdown || item.title || "").trim(), ...(item.user?.name && item.user.slug ? { author: { name: item.user.name, slug: item.user.slug } } : {}) }))
    .filter(prompt => prompt.text.length > 0 && prompt.text.length <= 2000);
}
