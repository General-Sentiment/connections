import { Welcome, hasConnection } from "@/components/welcome";
import Link from "@/components/app-link";
import { randomInt } from "node:crypto";
import { DirectoryOrder } from "@/components/directory-order";
import { DirectoryFilter } from "@/components/directory-filter";
import { intentions } from "@/lib/details";
import { availableProfileRef, readProfile } from "@/lib/profiles";
import { DirectoryView } from "@/components/directory-view";
import { DirectoryHeader } from "@/components/directory-header";
import { Card } from "@/components/card";
import { getSession } from "@/lib/session";
import { isDemo } from "@/lib/config";
import { ArenaClient } from "@/lib/arena";
import { discoverConversations, participants } from "@/lib/conversations";
import { demoChannel, demoPeople, demoProfiles } from "@/lib/demo";
import type { Item } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function Connections({ searchParams }: { searchParams: Promise<{ page?: string; view?: string; open_to?: string; order?: string; seed?: string }> }) {
  if (!await hasConnection()) return <Welcome />;
  const query = await searchParams; const filter = intentions.find(([key]) => key === query.open_to)?.[0]; const page = Math.max(1, Number(query.page) || 1); const view = query.view === "table" ? "table" : "grid"; const demo = isDemo(); const session = await getSession(); let channels: Item[] = []; let error = ""; let limited = false; let next: number | null = null;
  const order = query.order === "newest" || query.order === "random" ? query.order : "updated";
  const seed = /^\d{1,9}$/.test(query.seed || "") ? Number(query.seed) : randomInt(1, 1000000000);
  const collectAll = Boolean(filter) || order !== "updated";
  if (demo) channels = [{ ...demoChannel(600001, "Connection: Maya Chen & Alex Lee", demoPeople[1], 3), visibility: "private" }];
  else if (session?.person && session.token) try {
    const client = new ArenaClient(session.token);
    let current: number | null = collectAll ? 1 : page;
    let rounds = 0;
    do {
      if (++rounds > 50) throw new Error("There are too many conversations to load at once.");
      const result = await discoverConversations(client, session.person, current);
      channels.push(...result.channels); limited ||= result.limited;
      next = result.next; current = result.next;
      if (current !== null && current <= (collectAll ? rounds : page)) throw new Error("Could not load the next page of conversations.");
    } while (collectAll && current !== null);
  } catch (e) { error = e instanceof Error ? e.message : "Could not load conversations."; }
  if (filter && !error) try {
    const matching: Item[] = [];
    for (const channel of channels) {
      let profile;
      if (demo) profile = demoProfiles.find(profile => profile.person.id === demoPeople[1].id);
      else {
        const other = participants(channel).find(person => person.id !== session?.person?.id);
        if (!other) continue;
        const ref = await availableProfileRef(other.id, new ArenaClient(session!.token));
        if (ref?.published) profile = await readProfile(ref.channel_id);
      }
      if (profile?.details.open_to.includes(filter)) matching.push(channel);
    }
    channels = matching;
  } catch (e) { channels = []; next = null; error = e instanceof Error ? e.message : "Could not filter conversations."; }
  if (!error && (collectAll || demo)) {
    if (order === "random") channels.sort((a, b) => (Math.imul(a.id ^ seed, 2654435761) >>> 0) - (Math.imul(b.id ^ seed, 2654435761) >>> 0));
    else channels.sort((a, b) => Date.parse(order === "newest" ? b.created_at : b.updated_at) - Date.parse(order === "newest" ? a.created_at : a.updated_at));
    next = channels.length > page * 24 ? page + 1 : null;
    channels = channels.slice((page - 1) * 24, page * 24);
  }
  return <div className="page directory-page"><DirectoryHeader active="connections" />{!demo && !session?.person ? <div className="notice"><p>Log in to see your private conversations.</p><Link className="button" href="/api/auth/login?next=/connections">Log in with Are.na →</Link></div> : <><div className="info-grid"><section><h2 className="info-title">About</h2><p>Your conversations are private channels owned by you or your connection. The directory group has no access.</p>{limited && <details className="connection-availability"><summary>Some connections may be missing</summary><p>Are.na isn’t allowing this account to search for conversations. We’re showing the conversations we could find through your account’s channels. You can check for other shared conversations directly on <a href="https://www.are.na/" target="_blank" rel="noopener noreferrer">Are.na</a>.</p></details>}</section><section><h2 className="info-title">View</h2><DirectoryView view={view} /></section><section><h2 className="info-title">Order</h2><DirectoryOrder order={order} seed={seed} /></section><section><h2 className="info-title">Open to</h2><DirectoryFilter value={filter || "all"} /></section></div>{error && <p className="notice error">{error}</p>}<div className={view === "table" && channels.length ? "connection-table" : "grid"}>{!channels.length && !error && !filter && <Link className="first-connection-block" href="/">Create your first connection</Link>}{!channels.length && !error && filter && <p className="empty">No connections match this filter.</p>}{channels.map(channel => view === "table" ? <Link className="connection-table-row" key={channel.id} href={`/connections/${channel.id}`}><span>{channel.title}</span><span className="muted">{channel.counts?.contents ?? channel.counts?.blocks ?? 0} blocks</span></Link> : <Card key={channel.id} item={channel} href={`/connections/${channel.id}`} />)}</div>{next && <Link className="button" href={`/connections?page=${next}&view=${view}&order=${order}${order === "random" ? `&seed=${seed}` : ""}${filter ? `&open_to=${filter}` : ""}`}>Load more →</Link>}</>}{demo && <p className="preview-note">Preview · Sample conversation.</p>}</div>;
}
