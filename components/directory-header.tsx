import { ArenaButton } from "./arena-button";
import Link from "@/components/app-link";

export function DirectoryHeader({ active, arenaHref }: { active: "gallery" | "profiles" | "connections"; arenaHref?: string }) {
  return <header className="page-heading directory-heading"><nav aria-label="Main navigation"><h1>
    <Link href="/" className={active === "profiles" ? "heading-current" : "heading-parent"} aria-current={active === "profiles" ? "page" : undefined}>Profiles</Link>
    <span className="slash" aria-hidden="true">•</span>
    <Link href="/connections" className={active === "connections" ? "heading-current" : "heading-parent"} aria-current={active === "connections" ? "page" : undefined}>Connections</Link>
    <span className="slash" aria-hidden="true">•</span>
    <Link href="/gallery" className={active === "gallery" ? "heading-current" : "heading-parent"} aria-current={active === "gallery" ? "page" : undefined}>Gallery</Link>
  </h1></nav><div className="page-actions"><Link className="button" href="/profile/edit">My profile</Link><ArenaButton href={arenaHref || (active === "profiles" ? "https://www.are.na/connections-forum" : undefined)} /></div></header>;
}
