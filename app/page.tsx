import Link from "next/link";
import { DirectoryOrder } from "@/components/directory-order";
import { DirectoryView } from "@/components/directory-view";
import { ProfileCard } from "@/components/profile-card";
import { ProfileTable } from "@/components/profile-table";
import { readProfile } from "@/lib/profiles";
import { Header } from "@/components/header";
import { Card } from "@/components/card";
import { demoProfiles } from "@/lib/demo";
import { isDemo, directoryId, aboutBlockId } from "@/lib/config";
import { ArenaClient } from "@/lib/arena";
import { getSession } from "@/lib/session";
import { profileRef } from "@/lib/store";
import { randomInt } from "node:crypto";
import { directoryClient } from "@/lib/directory-auth";
import type { Page } from "@/lib/types";
import type { Item } from "@/lib/types";

export const dynamic = "force-dynamic";
export default async function Directory({ searchParams }: { searchParams: Promise<{ page?: string; error?: string; order?: string; seed?: string; view?: string }> }) {
  const query = await searchParams; const page = Math.max(1, Number(query.page) || 1); const demo = isDemo();
  const view = query.view === "table" ? "table" : "grid";
  const order = query.order === "updated" || query.order === "random" ? query.order : "newest";
  const seed = /^\d{1,9}$/.test(query.seed || "") ? Number(query.seed) : randomInt(1, 1000000000);
  const pageHref = (number: number) => `/?view=${view}&order=${order}&page=${number}${order === "random" ? `&seed=${seed}` : ""}`;
  const session = await getSession(); const existingProfile = session?.person ? profileRef(session.person.id) : undefined; let items: Item[] = []; let next: number | null = null; let error = "";
  if (demo) items = demoProfiles.map(p => p.channel);
  else if (directoryId()) { try { const client = new ArenaClient();
    let result: Page<Item>;
    if (order === "random") {
      const directory = await client.item("Channel", directoryId());
      const search = await directoryClient("");
      result = await search.request<Page<Item>>(`/search?query=*&channel_id=${directory.id}&type=Channel,Text&sort=random&seed=${seed}&page=${page}&per=8`);
    } else result = await client.contents(directoryId(), page, 8, order === "updated" ? "updated_at_desc" : "created_at_desc"); items = result.data.filter(x => (x.type === "Channel" && x.visibility !== "private") || (x.type === "Text" && x.title === "About" && x.visibility !== "private")); next = result.meta.next_page; } catch (e) { error = e instanceof Error ? e.message : "The directory could not be loaded."; } }
  if (demo) {
    if (order === "random") items.sort((a, b) => ((Math.imul(a.id ^ seed, 2654435761) >>> 0) - (Math.imul(b.id ^ seed, 2654435761) >>> 0)));
    else items.sort((a, b) => Date.parse(order === "updated" ? b.updated_at : b.created_at) - Date.parse(order === "updated" ? a.updated_at : a.created_at));
  }
  let about = items.find(item => item.type === "Text" && item.title === "About");
  if (!demo && !about && aboutBlockId()) {
    try { const block = await new ArenaClient().item("Block", aboutBlockId()); if (block.type === "Text" && block.visibility !== "private") about = block; } catch { /* Other directory content remains available. */ }
  }
  items = items.filter(item => item.type === "Channel");
  if (about) items.unshift(about);
  const entries = await Promise.all(items.map(async item => {
    if (item.type !== "Channel") return { item };
    try { return { item, profile: demo ? demoProfiles.find(p => p.channel.id === item.id) : await readProfile(item.id) }; }
    catch { return { item }; }
  }));
  return <div className="page directory-page"><Header actions={<><Link className="button" href="/profile/edit">{existingProfile ? "Edit profile" : "Add yourself"}{!existingProfile && <span aria-hidden>＋</span>}</Link><Link className="button" href="/connections">My connections</Link>{!session?.person ? <Link className="button" href="/api/auth/login">Log in</Link> : null}</>} />
    <div className="info-grid"><section><h2 className="info-title">About</h2><p>Meet people through their collections on Are.na.</p>{session?.person && <form className="about-logout" action="/api/auth/logout" method="post"><button className="quiet">Log out</button></form>}</section><section><h2 className="info-title">View</h2><DirectoryView view={view} /></section><section><h2 className="info-title">Order</h2><DirectoryOrder order={order} seed={seed} /></section></div>
    {query.error && <p className="notice error" role="alert">{query.error}</p>}{error && <p className="notice error" role="alert">{error}</p>}
    {!demo && !directoryId() && <div className="notice"><p>The directory is being set up.</p><Link href="/setup">Continue setup →</Link></div>}
    {view === "table" ? <ProfileTable entries={entries} /> : <div className="grid">{about && <Card item={about} />}{!existingProfile?.published && <Link className="add-square add-yourself-tile" href="/profile/edit"><span aria-hidden>＋</span><span>add yourself</span></Link>}{entries.filter(entry => entry.item.type === "Channel").map(({ item, profile }) => <ProfileCard key={item.id} item={item} profile={profile} />)}</div>}
    <div className="footer-actions"><span>{page > 1 && <Link href={pageHref(page - 1)}>← Previous</Link>}</span>{next && <Link href={pageHref(next)}>Next →</Link>}</div>
    {demo && <p className="preview-note">Preview · Sample profiles. Nothing here has been published to Are.na. <Link href="/setup">Connect the live directory →</Link></p>}
  </div>;
}
