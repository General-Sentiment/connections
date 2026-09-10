import { ArenaButton } from "./arena-button";
import Link from "@/components/app-link";
export function Header({ title, titleHref, actions, arenaHref, back = "/", parent = "Profiles" }: { title?: string; titleHref?: string; actions?: React.ReactNode; arenaHref?: string; back?: string; parent?: string }) {
  const displayTitle = parent === "Connections" ? title?.replace(/^Connection:\s*/i, "") : title;
  return <div className="page-heading"><h1>{title ? <><Link className="heading-parent" href={back}>{parent}</Link><span className="slash">/</span><span className="heading-current">{titleHref ? <a href={titleHref} target="_blank" rel="noopener noreferrer">{displayTitle}</a> : displayTitle}</span></> : "Connections"}</h1><div className="page-actions">{actions}<ArenaButton href={arenaHref} /></div></div>;
}
