import { randomInt } from "node:crypto";
import ReactMarkdown from "react-markdown";
import Link from "@/components/app-link";
import { DirectoryHeader } from "@/components/directory-header";
import { DirectoryView } from "@/components/directory-view";
import { DirectoryOrder } from "@/components/directory-order";
import { MobileDirectoryControls } from "@/components/mobile-directory-controls";
import { Card, CardFace } from "@/components/card";
import { Welcome, hasConnection } from "@/components/welcome";
import { ArenaClient } from "@/lib/arena";
import { allItems } from "@/lib/arena-discovery";
import { groupId } from "@/lib/config";
import { arenaUrl } from "@/lib/urls";
import type { Item } from "@/lib/types";

export const dynamic = "force-dynamic";
export default async function Gallery({ searchParams }: { searchParams: Promise<{ view?: string; order?: string; seed?: string; page?: string }> }) {
  if (!await hasConnection()) return <Welcome />;
  const query = await searchParams;
  const view = query.view === "table" ? "table" : "grid";
  const order = query.order === "updated" || query.order === "random" ? query.order : "newest";
  const seed = /^\d{1,9}$/.test(query.seed || "") ? Number(query.seed) : randomInt(1, 1000000000);
  const page = Math.max(1, Number(query.page) || 1);
  let channel: Item | undefined; let items: Item[] = []; let error = "";
  try {
    if (!groupId()) throw new Error("The directory group is not configured.");
    const client = new ArenaClient();
    const channels = await allItems(client, `/groups/${groupId()}/contents?type=Channel`);
    const found = channels.find(item => item.type === "Channel" && item.title?.trim().toLowerCase() === "gallery" && item.visibility !== "private");
    if (!found) throw new Error("The Gallery channel is not available yet.");
    channel = await client.item("Channel", found.id);
    items = (await allItems(client, `/channels/${channel.id}/contents`)).filter(item => item.type !== "Channel" && item.visibility !== "private");
    if (order === "random") items.sort((a, b) => (Math.imul(a.id ^ seed, 2654435761) >>> 0) - (Math.imul(b.id ^ seed, 2654435761) >>> 0));
    else items.sort((a, b) => Date.parse(order === "updated" ? b.updated_at : b.connection?.connected_at || b.created_at) - Date.parse(order === "updated" ? a.updated_at : a.connection?.connected_at || a.created_at));
  } catch (e) { error = e instanceof Error ? e.message : "The gallery could not be loaded."; }
  const visible = items.slice((page - 1) * 24, page * 24);
  const pageHref = (page: number) => `/gallery?view=${view}&order=${order}&page=${page}${order === "random" ? `&seed=${seed}` : ""}`;
  return <div className="page directory-page homepage gallery-page">
    <DirectoryHeader active="gallery" arenaHref={channel ? arenaUrl(channel) : undefined} />
    <MobileDirectoryControls><div className="info-grid">
      <section><h2 className="info-title">About</h2><ReactMarkdown skipHtml>{channel?.description?.markdown || channel?.description?.plain || ""}</ReactMarkdown></section>
      <section><h2 className="info-title">View</h2><DirectoryView view={view} /></section>
      <section><h2 className="info-title">Order</h2><DirectoryOrder order={order} seed={seed} /></section>
    </div></MobileDirectoryControls>
    {error && <p className="notice error" role="alert">{error}</p>}
    <div className={view === "table" ? "gallery-table" : "grid"}>{visible.map(item => view === "grid" ? <Card key={item.id} item={item} /> : <Link className="gallery-table-row" key={item.id} href={arenaUrl(item)} target="_blank" rel="noopener noreferrer"><div className="gallery-table-preview"><CardFace item={item} /></div><div><h2>{item.title || "Untitled"}</h2><p className="muted">{item.type}</p></div></Link>)}</div>
    {!error && !items.length && <p className="empty">The gallery is empty.</p>}
    <div className="footer-actions"><span>{page > 1 && <Link href={pageHref(page - 1)}>← Previous</Link>}</span>{items.length > page * 24 && <Link href={pageHref(page + 1)}>Next →</Link>}</div>
  </div>;
}
