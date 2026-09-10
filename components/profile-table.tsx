import Link from "@/components/app-link";
import ReactMarkdown from "react-markdown";
import type { Item, Profile } from "@/lib/types";
import { safeUrl, arenaUrl } from "@/lib/urls";
import { intentions } from "@/lib/details";
export function ProfileTable({ entries }: { entries: { item: Item; profile?: Profile }[] }) {
  return <div className="profile-table">{entries.map(({ item, profile }) => {
    if (item.type === "Text") return <article className="profile-table-row table-about" key={`Text:${item.id}`}><Link className="table-about-block" href={arenaUrl(item)} target="_blank" rel="noopener noreferrer" aria-label="Read About on Are.na"><div className="table-about-text"><ReactMarkdown skipHtml components={{ a: ({ children }) => <span>{children}</span>, img: () => null }}>{item.content?.markdown || item.content?.plain || ""}</ReactMarkdown></div></Link></article>;
    const image = safeUrl(profile?.photo?.image?.medium?.src || profile?.photo?.image?.src);
    return <article className="profile-table-row" key={`${item.type}:${item.id}`}>
      <div className="table-introduction table-preview"><h2><Link href={item.type === "Channel" ? `/people/${item.id}` : arenaUrl(item)}>{profile?.person.name || item.title}</Link></h2>
        <ReactMarkdown skipHtml>{profile?.whoAreYou || ""}</ReactMarkdown>{!profile && <p>Profile details are currently unavailable.</p>}
      </div>
      <div className="table-attributes-preview table-preview">{profile && <dl className="rows table-attributes">
        <div><dt>Location</dt><dd>{[profile.details.location.city, profile.details.location.country].filter(Boolean).join(", ") || "—"}</dd></div>
        <div><dt>Open to</dt><dd>{profile.details.open_to.map(value => intentions.find(([key]) => key === value)?.[1]).join(", ") || "—"}</dd></div>
        <div><dt>Meeting preference</dt><dd>{profile.details.local_only ? "Local only" : "Open to anywhere"}</dd></div>
      </dl>}</div>
      <div className="table-photo">{image && <Link href={`/people/${item.id}`}><img src={image} alt={profile?.person.name || "Profile photo"} /></Link>}</div>
    </article>;
  })}</div>;
}
