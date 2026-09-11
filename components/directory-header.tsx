import { getSession } from "@/lib/session";
import { availableProfileRef } from "@/lib/profiles";
import { ArenaClient } from "@/lib/arena";
import { isDemo } from "@/lib/config";
import { ArenaButton } from "./arena-button";
import Link from "@/components/app-link";

export async function DirectoryHeader({ active, arenaHref, hasProfile }: { active: "gallery" | "profiles" | "connections"; arenaHref?: string; hasProfile?: boolean }) {
  let profileLabel = hasProfile === undefined ? "Profile" : hasProfile ? "My profile" : "＋ Create profile";
  if (hasProfile === undefined) {
    try {
      const session = await getSession();
      const profile = !isDemo() && session?.person ? await availableProfileRef(session.person.id, new ArenaClient(session.token)) : undefined;
      profileLabel = profile ? "My profile" : "＋ Create profile";
    } catch { /* Keep a neutral label when profile lookup is unavailable. */ }
  }
  return <header className="page-heading directory-heading"><nav aria-label="Main navigation"><h1>
    <Link href="/" className={active === "profiles" ? "heading-current" : "heading-parent"} aria-current={active === "profiles" ? "page" : undefined}>Profiles</Link>
    <span className="slash" aria-hidden="true">•</span>
    <Link href="/connections" className={active === "connections" ? "heading-current" : "heading-parent"} aria-current={active === "connections" ? "page" : undefined}>Connections</Link>
    <span className="slash" aria-hidden="true">•</span>
    <Link href="/gallery" className={active === "gallery" ? "heading-current" : "heading-parent"} aria-current={active === "gallery" ? "page" : undefined}>Gallery</Link>
  </h1></nav><div className="page-actions"><Link className="button" href="/profile/edit">{profileLabel}</Link><ArenaButton href={arenaHref || (active === "profiles" ? "https://www.are.na/connections-forum" : undefined)} /></div></header>;
}
