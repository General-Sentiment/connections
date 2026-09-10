import type { Item } from "./types";
export function safeUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : undefined; } catch { return undefined; }
}
export function arenaUrl(item: Item): string {
  if (item.type !== "Channel") return `https://www.are.na/block/${item.id}`;
  return `https://www.are.na/${encodeURIComponent(item.owner?.slug || "channel")}/${encodeURIComponent(item.slug || String(item.id))}`;
}
export function parseArenaUrl(value: string): { type: "Block" | "Channel"; id: string } {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error("Enter a full Are.na block or channel URL."); }
  if (url.protocol !== "https:" || !["www.are.na", "are.na"].includes(url.hostname) || url.port || url.username || url.password) throw new Error("Use a link from are.na.");
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "block" && parts.length === 2 && /^\d+$/.test(parts[1])) return { type: "Block", id: parts[1] };
  if (parts.length === 2 && !["developers", "settings", "oauth", "search"].includes(parts[0]) && /^[a-z0-9_-]+$/i.test(parts[1])) return { type: "Channel", id: parts[1] };
  throw new Error("This is not an Are.na block or channel link.");
}
export const itemKey = (item: Pick<Item, "type" | "id">) => `${item.type === "Channel" ? "Channel" : "Block"}:${item.id}`;
