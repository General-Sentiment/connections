import Link from "@/components/app-link";

export function DirectoryHeader({ active }: { active: "profiles" | "connections" }) {
  return <header className="page-heading directory-heading"><nav aria-label="Main navigation"><h1>
    <Link href="/" className={active === "profiles" ? "heading-current" : "heading-parent"} aria-current={active === "profiles" ? "page" : undefined}>Profiles</Link>
    <span className="slash" aria-hidden="true">•</span>
    <Link href="/connections" className={active === "connections" ? "heading-current" : "heading-parent"} aria-current={active === "connections" ? "page" : undefined}>Connections</Link>
  </h1></nav><div className="page-actions"><Link className="button" href="/profile/edit">My profile</Link></div></header>;
}
