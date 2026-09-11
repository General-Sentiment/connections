import { AddPrompt } from "@/components/add-prompt";
import { DirectoryHeader } from "@/components/directory-header";
import { profilePrompts, type ProfilePrompt } from "@/lib/prompts";
import { relativeTime } from "@/lib/relative-time";
export const dynamic = "force-dynamic";
export default async function PromptsPage() {
  let prompts: ProfilePrompt[] = []; let error = "";
  try { prompts = await profilePrompts(); } catch (e) { error = e instanceof Error ? e.message : "Could not load prompts."; }
  return <div className="page"><DirectoryHeader active="prompts" arenaHref={`https://www.are.na/channel/${encodeURIComponent(process.env.ARENA_PROMPTS_CHANNEL || "prompts-lkiimgy92_0")}`} />
    {error && <p className="notice error" role="alert">{error}</p>}
    <div className="grid prompt-catalog"><AddPrompt />{prompts.map(prompt => <article className="prompt-catalog-card" key={prompt.id}>
      <a className="prompt-catalog-square" href={`https://www.are.na/block/${prompt.id}`} target="_blank" rel="noopener noreferrer">{prompt.text}</a>
      <div className="prompt-catalog-meta">{prompt.author && <div>Created by <a href={`https://www.are.na/${encodeURIComponent(prompt.author.slug)}`} target="_blank" rel="noopener noreferrer">{prompt.author.name}</a></div>}{prompt.addedAt && <time dateTime={prompt.addedAt}>{relativeTime(prompt.addedAt, Date.now())}</time>}</div>
    </article>)}</div>
    {!error && !prompts.length && <p className="empty">No prompts yet.</p>}
  </div>;
}
