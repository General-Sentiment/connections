import type { ArenaClient } from "./arena";
import type { Item, Page } from "./types";
// Never interpret a partial scan or request failure as evidence of absence.
export async function allItems(client: ArenaClient, path: string): Promise<Item[]> {
  const items: Item[] = [];
  let page: number | null = 1;
  for (let attempt = 0; page && attempt < 50; attempt++) {
    const result: Page<Item> = await client.request(`${path}${path.includes("?") ? "&" : "?"}per=100&page=${page}`);
    items.push(...result.data);
    const next: number | null = result.meta.next_page;
    if (next && next <= page) throw new Error("Are.na returned incomplete pagination. Please try again.");
    page = next;
  }
  if (page) throw new Error("There are too many items to safely check for an existing submission.");
  return items;
}
