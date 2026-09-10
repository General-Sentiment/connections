import Link from "next/link";
import type { Item, Profile } from "@/lib/types";
import { safeUrl } from "@/lib/urls";
export function ProfileCard({ item, profile }: { item: Item; profile?: Profile }) {
  const name = profile?.person.name || item.title || "Profile";
  const photo = safeUrl(profile?.photo?.image?.medium?.src || profile?.photo?.image?.src || profile?.person.avatar);
  return <article className="card"><Link href={`/people/${item.id}`} className="profile-card"><h2>{name}</h2>{photo ? <img src={photo} alt="" loading="lazy" /> : <span className="profile-card-placeholder" aria-hidden>{name.split(/\s+/).slice(0, 2).map(word => word[0]).join("")}</span>}</Link></article>;
}
