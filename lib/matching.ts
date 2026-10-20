import { mutuallyCompatible } from "./romance";
import { locationMetadata } from "./locations";
import type { Profile } from "./types";

export type LocationLevel = "city" | "state" | "country";
const normalized = (value?: string) => value?.trim().normalize("NFKC").toLowerCase() || "";
export function sameLocation(a: Profile, b: Profile, level: LocationLevel) {
  const first = a.details.location; const second = b.details.location;
  const country = normalized(String(locationMetadata(first).location_country || ""));
  if (!country || country !== normalized(String(locationMetadata(second).location_country || ""))) return false;
  if (level === "country") return true;
  if (level === "state") return Boolean(normalized(first.region)) && normalized(first.region) === normalized(second.region);
  if (first.id && second.id) return first.id === second.id;
  return Boolean(normalized(first.city)) && normalized(first.city) === normalized(second.city) && normalized(first.region) === normalized(second.region);
}
export type Match = { first: Profile; second: Profile; shared: Profile["details"]["open_to"]; sharedSexualities?: string[] };
export const matchKey = (first: number, second: number) => [first, second].sort((a, b) => a - b).join(":");
export function bestMatches(profiles: Profile[], location?: LocationLevel, options: { selfId?: number; seen?: ReadonlySet<string>; romantic?: boolean } = {}): Match[] {
  const matches: Match[] = []; let best = -1;
  const people = [...new Map(profiles.map(profile => [profile.person.id, profile])).values()];
  for (let i = 0; i < people.length; i++) for (let j = i + 1; j < people.length; j++) {
    const first = people[i]; const second = people[j];
    if (options.selfId !== undefined && first.person.id !== options.selfId && second.person.id !== options.selfId) continue;
    if (options.seen?.has(matchKey(first.person.id, second.person.id))) continue;
    if (location && !sameLocation(first, second, location)) continue;
    if ((first.details.local_only || second.details.local_only) && !sameLocation(first, second, "city")) continue;
    const romanceCompatible = mutuallyCompatible(first.details.romance, second.details.romance);
    if (options.romantic) {
      if (!first.details.open_to.includes("romance") || !second.details.open_to.includes("romance") || !romanceCompatible) continue;
      // Dedicated romantic matching requires stated identities, not legacy unknowns.
      if (!first.details.romance?.genders.length || !first.details.romance.sexualities.length || !second.details.romance?.genders.length || !second.details.romance.sexualities.length) continue;
    }
    const shared = [...new Set(first.details.open_to)].filter(value => second.details.open_to.includes(value) && (value !== "romance" || romanceCompatible));
    // Explicitly incompatible romance-only pairs must not fall through to random matching.
    if (!romanceCompatible && first.details.open_to.includes("romance") && second.details.open_to.includes("romance") && !shared.length) continue;
    const sharedSexualities = shared.includes("romance") ? (first.details.romance?.sexualities || []).filter(value => second.details.romance?.sexualities.includes(value)) : [];
    const score = shared.length * 100 + sharedSexualities.length;
    if (score < best) continue;
    if (score > best) { matches.length = 0; best = score; }
    matches.push({ first, second, shared, sharedSexualities });
  }
  return matches;
}
