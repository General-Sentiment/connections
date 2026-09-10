import { arenaUrl } from "@/lib/urls";
import { ArenaClient } from "@/lib/arena";
import { RefreshProfile } from "@/components/refresh-profile";
import { Welcome, hasConnection } from "@/components/welcome";
import Link from "@/components/app-link";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { Card } from "@/components/card";
import { isDemo } from "@/lib/config";
import { demoProfiles, demoBlocks, demoChannel } from "@/lib/demo";
import { readProfile, recentPublic } from "@/lib/profiles";
import { intentions } from "@/lib/details";
import { getSession } from "@/lib/session";
import ReactMarkdown from "react-markdown";
import { safeUrl, itemKey } from "@/lib/urls";
import type { Item, Profile } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  if (!await hasConnection()) return <Welcome />;
  const session = await getSession();
  const { id } = await params; const demo = isDemo(); let profile: Profile; let blocks: Item[] = []; let channels: Item[] = []; let recentError = "";
  if (demo) { const found = demoProfiles.find(p => String(p.channel.id) === id); if (!found) notFound(); profile = found; blocks = demoBlocks.slice(0, 4); channels = ["Public spaces", "Loose observations", "Printed matter", "Everyday objects"].map((title, i) => demoChannel(710000 + i, title, found.person, 20 + i)); }
  else { try { profile = await readProfile(id, new ArenaClient(session?.token)); } catch (e) { return <div className="page"><Header title="Profile" /><p className="notice error">{e instanceof Error ? e.message : "This profile is unavailable."}</p></div>; } const results = await Promise.allSettled([recentPublic(profile.person.id, "Block"), recentPublic(profile.person.id, "Channel")]); if (results[0].status === "fulfilled") blocks = results[0].value; if (results[1].status === "fulfilled") channels = results[1].value; if (results.some(r => r.status === "rejected")) recentError = "Recent items could not be loaded from Are.na. Try again shortly."; }
  const formatDate = (value: string) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }); };
  const photo = safeUrl(profile.photo?.image?.medium?.src || profile.photo?.image?.src);
  return <div className="page"><RefreshProfile /><Header arenaHref={arenaUrl(profile.channel)} title={profile.person.name} titleHref={`https://www.are.na/${profile.person.slug}`} actions={<>{session?.person?.id === profile.person.id ? <Link className="button" href="/profile/edit">Edit profile</Link> : <Link className="button" href={`/connections/new?person=${profile.person.id}&profile=${profile.channel.id}`}>Connect →</Link>}</>} />
    <div className="profile-introduction">
      {photo && <div className="profile-content-photo"><img src={photo} alt={profile.person.name} /></div>}
      <dl className="rows profile-attributes">
        <div><dt>Location</dt><dd>{[profile.details.location.city, profile.details.location.country].filter(Boolean).join(", ") || "—"}</dd></div>
        <div><dt>Open to</dt><dd>{intentions.filter(([value]) => profile.details.open_to.includes(value)).map(([, label]) => label).join(", ") || "—"}</dd></div>
        <div><dt>Meeting preference</dt><dd>{profile.details.local_only ? "Local only" : "Open to anywhere"}</dd></div>
        <div><dt>Created</dt><dd><time dateTime={profile.channel.created_at}>{formatDate(profile.channel.created_at)}</time></dd></div>
        <div><dt>Last updated</dt><dd><time dateTime={profile.channel.updated_at}>{formatDate(profile.channel.updated_at)}</time></dd></div>
      </dl>
      <section className="profile-introduction-text"><h2 className="info-title">Who are you?</h2><p className="preview-text">{profile.whoAreYou || "—"}</p></section>
      <section className="profile-introduction-text"><h2 className="info-title">Looking for</h2><p className="preview-text">{profile.lookingFor || "—"}</p></section>
    </div>
    {profile.warning && <p className="notice">{profile.warning}</p>}{[["Selected", profile.selected], ["Recent blocks", blocks], ["Recent channels", channels]].map(([title, entries]) => <section key={title as string} className={`content-section${title !== "Selected" ? " recent-blocks-section" : ""}`}>{title !== "Selected" && <h2 className="section-heading">{title as string}</h2>}<div className={title === "Selected" ? "featured-profile-items" : "grid recent-grid"}>{(entries as Item[]).map(item => <div key={itemKey(item)}><Card item={item} />{title === "Selected" && profile.selectedDescriptions?.[itemKey(item)] && <div className="featured-description"><ReactMarkdown skipHtml>{profile.selectedDescriptions[itemKey(item)]}</ReactMarkdown></div>}</div>)}</div>{!(entries as Item[]).length && <p className="empty">{title === "Selected" ? "No selections available." : recentError || "No public items yet."}</p>}</section>)}
    {demo && <p className="preview-note">Sample profile · Public Are.na blocks are shown as rendering examples.</p>}
  </div>;
}
