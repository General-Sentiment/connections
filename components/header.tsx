import Link from "@/components/app-link";
export function Header({ title, titleHref, actions, back = "/", parent = "Profiles" }: { title?: string; titleHref?: string; actions?: React.ReactNode; back?: string; parent?: string }) {
  return <div className="page-heading"><h1>{title ? <><Link className="heading-parent" href={back}>{parent}</Link><span className="slash">/</span><span className="heading-current">{titleHref ? <a href={titleHref} target="_blank" rel="noopener noreferrer">{title}</a> : title}</span></> : "Connections"}</h1><div className="page-actions">{actions}</div></div>;
}
