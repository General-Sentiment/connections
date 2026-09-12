import { logServerError } from "@/lib/logging";
import { DevListing } from "@/components/dev-debug";
import { DirectoryLocation, type LocationOption } from "@/components/directory-location";
import { countryName, locationMatches } from "@/lib/locations";
import { DirectoryHeader } from "@/components/directory-header";
import { MobileDirectoryControls } from "@/components/mobile-directory-controls";
import { DirectoryFilter } from "@/components/directory-filter";
import { intentions } from "@/lib/details";
import { allItems } from "@/lib/arena-discovery";
import { Welcome, hasConnection } from "@/components/welcome";
import Link from "@/components/app-link";
import { DirectoryOrder } from "@/components/directory-order";
import { DirectoryView } from "@/components/directory-view";
import { ProfileCard } from "@/components/profile-card";
import { ProfileTable } from "@/components/profile-table";
import { readProfile, availableProfileRef } from "@/lib/profiles";
import { Card } from "@/components/card";
import { demoProfiles } from "@/lib/demo";
import { isDemo, groupId, aboutBlockId } from "@/lib/config";
import { RefreshProfile } from "@/components/refresh-profile";
import { ArenaClient, ArenaError } from "@/lib/arena";
import { getSession } from "@/lib/session";
import { randomInt } from "node:crypto";
import { directoryClient } from "@/lib/directory-auth";
import type { Item } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profiles" };

export default async function Directory({ searchParams }: { searchParams: Promise<{ page?: string; error?: string; order?: string; seed?: string; view?: string; open_to?: string; country?: string; city?: string }> }) {
  if (!await hasConnection()) return <Welcome />;
  const query = await searchParams; const page = Math.max(1, Number(query.page) || 1); const demo = isDemo();
  const filter = intentions.find(([value]) => value === query.open_to)?.[0];
  const country = (query.country || "").slice(0, 100);
  const city = /^osm:[NWR]:\d+$/.test(query.city || "") ? query.city! : "";
  const hasFilter = Boolean(filter || country || city);
  let locations: LocationOption[] = [];
  const view = query.view === "table" ? "table" : "grid";
  const order = query.order === "updated" || query.order === "random" ? query.order : "newest";
  const seed = /^\d{1,9}$/.test(query.seed || "") ? Number(query.seed) : randomInt(1, 1000000000);
  const pageHref = (number: number) => `/?view=${view}&order=${order}&page=${number}${country ? `&country=${encodeURIComponent(country)}` : ""}${city ? `&city=${encodeURIComponent(city)}` : ""}${filter ? `&open_to=${filter}` : ""}${order === "random" ? `&seed=${seed}` : ""}`;
  const session = await getSession(); let existingProfile: Awaited<ReturnType<typeof availableProfileRef>>; let items: Item[] = []; let next: number | null = null; let error = "";
  if (session?.person && !demo) {
    try { existingProfile = await availableProfileRef(session.person.id, new ArenaClient(session.token)); }
    catch { /* Preserve the reference during temporary API failures. */ }
  }
  if (demo) items = demoProfiles.map(p => p.channel);
  else if (groupId()) { try {
    const client = order === "random" ? await directoryClient("") : new ArenaClient();
    const path = order === "random" ? `/search?query=*&group_id=${groupId()}&type=Channel&sort=random&seed=${seed}` : `/groups/${groupId()}/contents?type=Channel&sort=${order === "updated" ? "updated_at_desc" : "created_at_desc"}`;
    items = (await allItems(client, path)).filter(x => x.type === "Channel" && x.visibility !== "private" && x.owner?.type === "Group" && x.owner.id === groupId() && x.metadata?.app === "connections" && x.metadata?.published === true && x.metadata?.hidden !== true);
  } catch (e) { logServerError(e, { event: "page.load_failed", route: "/", method: "GET" }); error = e instanceof Error ? e.message : "The directory could not be loaded."; } }
  if (demo) {
    if (order === "random") items.sort((a, b) => ((Math.imul(a.id ^ seed, 2654435761) >>> 0) - (Math.imul(b.id ^ seed, 2654435761) >>> 0)));
    else items.sort((a, b) => Date.parse(order === "updated" ? b.updated_at : b.created_at) - Date.parse(order === "updated" ? a.updated_at : a.created_at));
  }
  locations = [...new Map(items.flatMap(item => {
    const m = item.metadata;
    if (typeof m?.location_country !== "string" || !m.location_country) return [];
    const country = m.location_country;
    const id = typeof m.location_id === "string" ? m.location_id : "";
    return [[id || `country:${country}`, { id, city: String(m.location_city || ""), region: String(m.location_region || ""), country, countryLabel: /^[A-Z]{2}$/.test(country) ? countryName(country) : country }] as const];
  })).values()];
  items = items.filter(item => locationMatches(item.metadata, country, city));
  let about = hasFilter ? undefined : items.find(item => item.type === "Text" && item.title === "About");
  if (view !== "table" && !hasFilter && !demo && !about && aboutBlockId()) {
    try { const block = await new ArenaClient().item("Block", aboutBlockId()); if (block.type === "Text" && block.visibility !== "private") about = block; } catch { /* Other directory content remains available. */ }
  }
  items = items.filter(item => item.type === "Channel");
  if (!filter) { next = items.length > page * 8 ? page + 1 : null; items = items.slice((page - 1) * 8, page * 8); }
  if (about) items.unshift(about);
  let entries = await Promise.all(items.map(async item => {
    if (item.type !== "Channel") return { item };
    try { return { item, profile: demo ? demoProfiles.find(p => p.channel.id === item.id) : await readProfile(item.id, new ArenaClient(), item) }; }
    catch (error) { return { item, unavailable: error instanceof ArenaError && error.status === 404 }; }
  }));
  entries = entries.filter(entry => !("unavailable" in entry && entry.unavailable));
  if (filter) {
    const matching = entries.filter(entry => entry.profile?.details.open_to.includes(filter));
    next = matching.length > page * 8 ? page + 1 : null;
    entries = matching.slice((page - 1) * 8, page * 8);
  }
  return <div className="page directory-page homepage"><RefreshProfile /><DirectoryHeader active="profiles" hasProfile={Boolean(existingProfile)} />
    <MobileDirectoryControls><div className="info-grid"><section><h2 className="info-title">View</h2><DirectoryView view={view} /></section><section><h2 className="info-title">Order</h2><DirectoryOrder order={order} seed={seed} /></section><section><h2 className="info-title">Open to</h2><DirectoryFilter value={filter || "all"} /></section><section><h2 className="info-title">Location</h2><DirectoryLocation locations={locations} country={country} city={city} /></section></div></MobileDirectoryControls>
    <DevListing view={view}>{query.error && <p className="notice error" role="alert">{query.error}</p>}{error && <p className="notice error" role="alert">{error}</p>}
    {!demo && !groupId() && <div className="notice"><p>The directory is being set up.</p><Link href="/setup">Continue setup →</Link></div>}
    {view === "table" ? <ProfileTable entries={entries.filter(entry => entry.item.type === "Channel")} /> : <div className="grid">{!existingProfile?.published && <Link className="add-square add-yourself-tile" href="/profile/edit"><span aria-hidden>＋</span><span className="add-yourself-label">Add Yourself</span></Link>}{about && <div className="about-card"><Card item={about} caption="Info" /></div>}{entries.filter(entry => entry.item.type === "Channel").map(({ item, profile }) => <ProfileCard key={item.id} item={item} profile={profile} />)}</div>}
    {!error && hasFilter && !entries.length && <p className="empty">No profiles match these filters.</p>}
    <div className="footer-actions"><span>{page > 1 && <Link href={pageHref(page - 1)}>← Previous</Link>}</span>{next && <Link href={pageHref(next)}>Next →</Link>}</div>
    </DevListing>{demo && <p className="preview-note">Preview · Sample profiles. Nothing here has been published to Are.na. <Link href="/setup">Connect the live directory →</Link></p>}
  </div>;
}
