import { MobileDirectoryControls } from "@/components/mobile-directory-controls";
import { randomInt } from "node:crypto";
import ReactMarkdown from "react-markdown";
import { ArenaClient } from "@/lib/arena";
import { DirectoryView } from "@/components/directory-view";
import { DirectoryOrder } from "@/components/directory-order";
import { logServerError } from "@/lib/logging";
import { AddPrompt } from "@/components/add-prompt";
import { DirectoryHeader } from "@/components/directory-header";
import { profilePrompts, type ProfilePrompt } from "@/lib/prompts";
import { relativeTime } from "@/lib/relative-time";
export const dynamic = "force-dynamic";
export const metadata = { title: "Prompts" };

export default async function PromptsPage({ searchParams }: { searchParams: Promise<{ view?: string; order?: string; seed?: string }> }) {
  const query = await searchParams;
  const view = query.view === "table" ? "table" : "grid";
  const order = query.order === "random" ? "random" : query.order === "updated" ? "updated" : "newest";
  const seed = /^\d{1,9}$/.test(query.seed || "") ? Number(query.seed) : randomInt(1, 1000000000);
  const channelId = process.env.ARENA_PROMPTS_CHANNEL || "prompts-lkiimgy92_0";
  let description = "";

  let prompts: ProfilePrompt[] = []; let error = "";
  try { prompts = await profilePrompts(); } catch (e) { logServerError(e, { event: "page.load_failed", route: "/prompts", method: "GET" }); error = e instanceof Error ? e.message : "Could not load prompts."; }
  try {
    const channel = await new ArenaClient().item("Channel", channelId);
    description = channel.description?.markdown || channel.description?.plain || "";
  } catch (e) { logServerError(e, { event: "page.load_failed", route: "/prompts", method: "GET" }); description = "Channel information is currently unavailable."; }
  prompts.sort((a, b) => order === "random"
    ? (Math.imul(a.id ^ seed, 2654435761) >>> 0) - (Math.imul(b.id ^ seed, 2654435761) >>> 0)
    : Date.parse((order === "updated" ? b.updatedAt : b.createdAt) || b.addedAt || "1970-01-01") - Date.parse((order === "updated" ? a.updatedAt : a.createdAt) || a.addedAt || "1970-01-01"));
  return <div className="page"><DirectoryHeader active="prompts" arenaHref={`https://www.are.na/channel/${encodeURIComponent(process.env.ARENA_PROMPTS_CHANNEL || "prompts-lkiimgy92_0")}`} />
    <MobileDirectoryControls><div className="info-grid"><section><h2 className="info-title">Info</h2><ReactMarkdown skipHtml>{description}</ReactMarkdown></section><section><h2 className="info-title">View</h2><DirectoryView view={view} /></section><section><h2 className="info-title">Order</h2><DirectoryOrder order={order} seed={seed} /></section></div></MobileDirectoryControls>
    {error && <p className="notice error" role="alert">{error}</p>}
    <div className={view === "table" ? "prompt-catalog prompt-catalog-table" : "grid prompt-catalog"}><AddPrompt />{prompts.map(prompt => <article className="prompt-catalog-card" key={prompt.id}>
      <a className="prompt-catalog-square" href={`https://www.are.na/block/${prompt.id}`} target="_blank" rel="noopener noreferrer">{prompt.text}</a>
      <div className="prompt-catalog-meta">{prompt.author && <div>Created by <a href={`https://www.are.na/${encodeURIComponent(prompt.author.slug)}`} target="_blank" rel="noopener noreferrer">{prompt.author.name}</a></div>}{prompt.addedAt && <time dateTime={prompt.addedAt}>{relativeTime(prompt.addedAt, Date.now())}</time>}</div>
    </article>)}</div>
    {!error && !prompts.length && <p className="empty">No prompts yet.</p>}
  </div>;
}
