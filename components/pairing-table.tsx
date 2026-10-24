import { safeUrl } from "@/lib/urls";
import Link from "./app-link";
import { intentions } from "@/lib/details";
import type { Match } from "@/lib/matching";
import type { Profile } from "@/lib/types";
export function PairingTable({ pairs, unpaired, location, romanticPreferences }: { pairs: Match[]; unpaired: Profile[]; location?: string; romanticPreferences?: boolean }) {
  const personCell = (profile: Profile) => {
    const photo = safeUrl(profile.photo?.image?.square?.src || profile.photo?.image?.medium?.src || profile.photo?.image?.src || profile.person.avatar);
    return <td><Link className="pairing-person" href={`/people/${profile.channel.id}`}>{photo ? <img src={photo} alt="" loading="lazy" /> : <span className="pairing-avatar-placeholder" aria-hidden>{profile.person.name.split(/\s+/).slice(0, 2).map(word => word[0]).join("")}</span>}<span>{profile.person.name}</span></Link></td>;
  };
  return <section aria-label="Pairings"><h2>{pairs.length} {pairs.length === 1 ? "pair" : "pairs"}</h2>
    <div className="pairing-table-scroll"><table className="pairing-table"><thead><tr><th scope="col">Person 1</th><th scope="col">Person 2</th><th scope="col">Paired based on</th></tr></thead><tbody>{pairs.map(pair => <tr key={`${pair.first.person.id}:${pair.second.person.id}`}>{personCell(pair.first)}{personCell(pair.second)}<td>{pair.shared.length ? intentions.filter(([value]) => pair.shared.includes(value)).map(([, label]) => label).join(", ") : "Random — no shared preferences"}{Boolean(pair.sharedSexualities?.length) && <div className="small muted">Shared sexuality: {pair.sharedSexualities!.join(", ")}</div>}{!pair.fallback && romanticPreferences && <div className="small muted">Mutual romantic preferences</div>}{!pair.fallback && (location || pair.first.details.local_only || pair.second.details.local_only) && <div className="small muted">Same {pair.first.details.local_only || pair.second.details.local_only ? "city" : location}</div>}{pair.fallback && <div className="small muted">{pair.fallback}</div>}</td></tr>)}</tbody></table></div>
    {unpaired.length > 0 && <div className="notice"><p>Unpaired: {unpaired.map(profile => profile.person.name).join(", ")}</p><p className="small muted">No new eligible partner was available.</p></div>}
  </section>;
}
