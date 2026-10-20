import Link from "@/components/app-link";
import type { Item, Profile } from "@/lib/types";
import { safeUrl } from "@/lib/urls";
export function ProfileCard({ item, profile }: { item: Item; profile?: Profile }) {
  const name = profile?.person.name || item.title || "Profile";
  const photo = safeUrl(profile?.photo?.image?.medium?.src || profile?.photo?.image?.src || profile?.person.avatar);
  return <PersonProfileCard id={item.id} name={name} photo={photo} />;
}
export function PersonProfileCard({ id, name, photo }: { id: number; name: string; photo?: string | null }) {
  const image = safeUrl(photo);
  return <article className="card"><Link href={`/people/${id}`} className="profile-card"><h2>{name}</h2>{image ? <img src={image} alt="" loading="lazy" /> : <span className="profile-card-placeholder" aria-hidden>{name.split(/\s+/).slice(0, 2).map(word => word[0]).join("")}</span>}</Link></article>;
}
