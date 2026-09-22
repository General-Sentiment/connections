import { Card } from "@/components/card";
import type { Item } from "@/lib/types";

export function DirectoryAbout({ item, blockId }: { item?: Item; blockId: string }) {
  if (item) return <div className="about-card"><Card item={item} caption="Info" /></div>;
  const content = <><div className="card-square text-block"><div className="text-tile"><p><strong>Connections is a personals list for people on Are.na.</strong> Meet through what you collect and create, whether you’re looking for conversation, friendship, creative partnership, romance, or just someone new to meet.</p><p>Explore profiles and connect through shared interests. Conversations happen in private Are.na channels shared by the two participants.</p></div></div><div className="card-caption">Info</div></>;
  return <div className="about-card"><article className="card">{blockId ? <a className="card-link" href={`https://www.are.na/block/${encodeURIComponent(blockId)}`} target="_blank" rel="noopener noreferrer">{content}</a> : content}</article></div>;
}
