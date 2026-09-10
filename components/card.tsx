import Link from "@/components/app-link";
import ReactMarkdown from "react-markdown";
import type { Item } from "@/lib/types";
import { arenaUrl, safeUrl } from "@/lib/urls";

export function CardFace({ item, channelTitle }: { item: Item; channelTitle?: React.ReactNode }) {
  const image = safeUrl(item.image?.medium?.src || item.image?.src);
  return <div className={`card-square ${item.type === "Channel" ? `channel-tile ${item.visibility}` : item.type === "Text" ? "text-block" : ""}`}>
    {item.type === "Channel" ? <div className="channel-inner"><div className="channel-title">{channelTitle ?? item.title}</div><div className="channel-meta"><strong>by {item.owner?.name}</strong><br />{item.counts?.contents ?? item.counts?.blocks ?? 0} blocks</div></div>
      : item.type === "Text" ? <div className="text-tile"><ReactMarkdown skipHtml components={{ a: ({ children }) => <span>{children}</span>, img: () => null }}>{item.content?.markdown || item.content?.plain || item.title || ""}</ReactMarkdown></div>
      : image ? <img src={image} alt={item.image?.alt_text || item.title || "Are.na block"} loading="lazy" />
      : <div className="fallback-tile">{item.title || "Processing block…"}</div>}
    {["Link", "Embed", "Attachment"].includes(item.type) && <span className="type-label">{item.source?.provider?.name || item.type}</span>}
  </div>;
}
export function Card({ item, href, caption }: { item: Item; href?: string; caption?: string }) {
  return <article className="card"><Link href={href || arenaUrl(item)} {...(!href ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="card-link"><CardFace item={item} />{item.type !== "Channel" && <div className="card-caption" title={caption || item.title || ""}>{caption || item.title}</div>}</Link></article>;
}
