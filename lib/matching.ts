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
export type Match = { first: Profile; second: Profile; shared: Profile["details"]["open_to"]; sharedSexualities?: string[]; fallback?: string };
export const matchKey = (first: number, second: number) => [first, second].sort((a, b) => a - b).join(":");
export function bestMatches(profiles: Profile[], location?: LocationLevel, options: { selfId?: number; seen?: ReadonlySet<string>; romantic?: boolean; romanticPreferences?: boolean; preferenceCounts?: ReadonlyMap<string, number> } = {}): Match[] {
  const matches: Match[] = []; let best = -1; let rarest = Infinity;
  const people = [...new Map(profiles.map(profile => [profile.person.id, profile])).values()];
  for (let i = 0; i < people.length; i++) for (let j = i + 1; j < people.length; j++) {
    const first = people[i]; const second = people[j];
    if (options.selfId !== undefined && first.person.id !== options.selfId && second.person.id !== options.selfId) continue;
    if (options.seen?.has(matchKey(first.person.id, second.person.id))) continue;
    if (location && !sameLocation(first, second, location)) continue;
    if ((first.details.local_only || second.details.local_only) && !sameLocation(first, second, "city")) continue;
    const requirePreferences = options.romanticPreferences ?? true;
    const romanceCompatible = (options.romantic && !requirePreferences) || mutuallyCompatible(first.details.romance, second.details.romance);
    if (options.romantic) {
      if (!first.details.open_to.includes("romance") || !second.details.open_to.includes("romance") || !romanceCompatible) continue;
      // Dedicated romantic matching requires stated identities, not legacy unknowns.
      if (requirePreferences && (!first.details.romance?.genders.length || !first.details.romance.sexualities.length || !second.details.romance?.genders.length || !second.details.romance.sexualities.length)) continue;
    }
    const shared = [...new Set(first.details.open_to)].filter(value => second.details.open_to.includes(value) && (value !== "romance" || romanceCompatible));
    // Explicitly incompatible romance-only pairs must not fall through to random matching.
    if (!romanceCompatible && first.details.open_to.includes("romance") && second.details.open_to.includes("romance") && !shared.length) continue;
    const sharedSexualities = shared.includes("romance") && !(options.romantic && !requirePreferences) ? (first.details.romance?.sexualities || []).filter(value => second.details.romance?.sexualities.includes(value)) : [];
    const score = shared.length * 100 + sharedSexualities.length;
    const scarcity = options.preferenceCounts && shared.length ? options.preferenceCounts.get([...shared].sort().join(":")) ?? Infinity : Infinity;
    if (scarcity > rarest || (scarcity === rarest && score < best)) continue;
    if (scarcity < rarest || score > best) { matches.length = 0; best = score; rarest = scarcity; }
    matches.push({ first, second, shared, sharedSexualities });
  }
  return matches;
}

export function pairEveryone(profiles: Profile[], location?: LocationLevel, options: Parameters<typeof bestMatches>[2] = {}, random = Math.random) {
  let remaining = [...new Map(profiles.map(profile => [profile.person.id, profile])).values()];
  const pairs: Match[] = [];
  // Count every nonempty preference combination in the original round pool.
  // Keeping this fixed prevents priorities from changing as people are paired.
  const preferenceCounts = new Map<string, number>();
  for (const person of remaining) {
    const preferences = [...new Set(person.details.open_to)].sort();
    for (let mask = 1; mask < 2 ** preferences.length; mask++) {
      const key = preferences.filter((_, index) => mask & (1 << index)).join(":");
      preferenceCounts.set(key, (preferenceCounts.get(key) || 0) + 1);
    }
  }
  const scarcityOptions = { ...options, preferenceCounts };
  // Prioritize the rarest shared combination, then overlap, randomizing ties.
  while (remaining.length > 1) {
    const candidates = bestMatches(remaining, location, scarcityOptions);
    if (!candidates.length) break;
    const chosen = candidates[Math.floor(random() * candidates.length)];
    pairs.push(chosen);
    remaining = remaining.filter(profile => profile.person.id !== chosen.first.person.id && profile.person.id !== chosen.second.person.id);
  }
  const allPeople = [...new Map(profiles.map(profile => [profile.person.id, profile])).values()];
  function fallback(first: Profile, second: Profile, reason: string): Match {
    // These are general introductions, not claims of romantic/location compatibility.
    const shared = first.details.open_to.filter(value => value !== "romance" && second.details.open_to.includes(value));
    return { first, second, shared, fallback: reason };
  }
  while (remaining.length > 1) {
    const candidates: [Profile, Profile][] = [];
    for (let i = 0; i < remaining.length; i++) for (let j = i + 1; j < remaining.length; j++) {
      if (!options.seen?.has(matchKey(remaining[i].person.id, remaining[j].person.id))) candidates.push([remaining[i], remaining[j]]);
    }
    if (!candidates.length) break;
    const [first, second] = candidates[Math.floor(random() * candidates.length)];
    pairs.push(fallback(first, second, "General introduction — selected filters could not be satisfied."));
    remaining = remaining.filter(person => person.person.id !== first.person.id && person.person.id !== second.person.id);
  }
  if (remaining.length === 1 && allPeople.length > 1) {
    const first = remaining[0];
    const partners = allPeople.filter(person => person.person.id !== first.person.id);
    const candidates = partners.flatMap(person => bestMatches([first, person], location, scarcityOptions));
    if (candidates.length) {
      const chosen = candidates[Math.floor(random() * candidates.length)];
      pairs.push({ ...chosen, fallback: "Odd number of people — one person participates in two pairs." });
    } else {
      const unseen = partners.filter(person => !options.seen?.has(matchKey(first.person.id, person.person.id)));
      if (!unseen.length) return { pairs, unpaired: remaining };
      pairs.push(fallback(first, unseen[Math.floor(random() * unseen.length)], "General introduction — odd number of people; one person participates twice. Selected filters may not be satisfied."));
    }
    remaining = [];
  }
  return { pairs, unpaired: remaining };
}
