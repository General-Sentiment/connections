import { getSession } from "@/lib/session";
import { availableProfileRef } from "@/lib/profiles";
import { ArenaClient } from "@/lib/arena";
import { isDemo } from "@/lib/config";
import { ArenaButton } from "./arena-button";
import Link from "@/components/app-link";

export async function DirectoryHeader({ active, arenaHref, hasProfile }: { active: "prompts" | "profiles" | "connections"; arenaHref?: string; hasProfile?: boolean }) {
  return <header className="page-heading directory-heading"><nav aria-label="Main navigation"><h1>
    <Link href="/" className={active === "profiles" ? "heading-current" : "heading-parent"} aria-current={active === "profiles" ? "page" : undefined}>Profiles</Link>
    <span className="slash" aria-hidden="true">•</span>
    <Link href="/connections" className={active === "connections" ? "heading-current" : "heading-parent"} aria-current={active === "connections" ? "page" : undefined}>Connections</Link>
    <span className="slash" aria-hidden="true">•</span>
    <Link href="/prompts" className={active === "prompts" ? "heading-current" : "heading-parent"} aria-current={active === "prompts" ? "page" : undefined}>Prompts</Link>
  </h1></nav><div className="page-actions"><ArenaButton href={arenaHref || (active === "profiles" ? "https://www.are.na/connections-forum" : undefined)} /></div></header>;
}
