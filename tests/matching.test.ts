import { describe, expect, it } from "vitest";
import { pairEveryone, bestMatches, sameLocation } from "../lib/matching";
import { demoProfiles } from "../lib/demo";
import type { Profile } from "../lib/types";
function profile(id: number, choices: Profile["details"]["open_to"], location = { city: "Los Angeles", region: "California", country: "United States", country_code: "US" }) : Profile {
  return { ...demoProfiles[0], person: { ...demoProfiles[0].person, id }, details: { ...demoProfiles[0].details, open_to: choices, local_only: false, location } };
}
describe("matching", () => {
  it("prioritizes shared looking-for choices and retains ties", () => {
    const pairs = bestMatches([profile(1, ["friendship", "conversation"]), profile(2, ["friendship", "conversation"]), profile(3, ["friendship", "conversation"]), profile(4, ["romance"])]);
    expect(pairs).toHaveLength(3);
    expect(pairs.every(pair => pair.shared.length === 2)).toBe(true);
  });
  it("allows a random fallback with no shared choices and prevents self matches", () => {
    expect(bestMatches([profile(1, ["friendship"]), profile(2, ["romance"])])[0].shared).toEqual([]);
    expect(bestMatches([profile(1, ["friendship"]), profile(1, ["friendship"])])).toEqual([]);
  });
  it("checks each location level and respects local-only choices", () => {
    const a = profile(1, ["friendship"]);
    const b = profile(2, ["friendship"], { ...a.details.location, city: "San Francisco", region: "California", country_code: "US" });
    expect(sameLocation(a, b, "city")).toBe(false);
    expect(sameLocation(a, b, "state")).toBe(true);
    expect(sameLocation(a, b, "country")).toBe(true);
    expect(bestMatches([a, b], "city")).toEqual([]);
    expect(bestMatches([a, b], "state")).toHaveLength(1);
    a.details.local_only = true;
    expect(bestMatches([a, b])).toEqual([]);
  });
  it("does not match missing locations or identically named cities in different states", () => {
    const a = profile(1, ["friendship"]); const b = profile(2, ["friendship"]);
    a.details.location.region = ""; b.details.location.region = "";
    expect(sameLocation(a, b, "state")).toBe(false);
    a.details.location.region = "California"; b.details.location.region = "Texas";
    expect(sameLocation(a, b, "city")).toBe(false);
    a.details.location.country = ""; delete a.details.location.country_code;
    expect(sameLocation(a, b, "country")).toBe(false);
  });
});

it("limits matches to yourself and moves to the next best unseen pair", () => {
  const profiles = [profile(1, ["conversation", "friendship"]), profile(2, ["conversation", "friendship"]), profile(3, ["friendship"]), profile(4, ["romance"])];
  const seen = new Set(["1:2"]);
  const pairs = bestMatches(profiles, undefined, { selfId: 1, seen });
  expect(pairs).toHaveLength(1);
  expect(pairs[0].second.person.id).toBe(3);
  seen.add("1:3"); seen.add("1:4");
  expect(bestMatches(profiles, undefined, { selfId: 1, seen })).toEqual([]);
});

it("requires mutual explicit gender preferences for romance without blocking friendship", () => {
  const a = profile(1, ["romance"]); const b = profile(2, ["romance"]);
  a.details.romance = { genders: ["Woman"], sexualities: ["Bisexual"], interested_in: ["Woman"] };
  b.details.romance = { genders: ["Man"], sexualities: ["Bisexual"], interested_in: ["Woman"] };
  expect(bestMatches([a, b])).toEqual([]);
  a.details.open_to.push("friendship"); b.details.open_to.push("friendship");
  expect(bestMatches([a, b])[0].shared).toEqual(["friendship"]);
});

it("uses shared sexuality only for compatible romantic matches and keeps legacy profiles working", () => {
  const a = profile(1, ["romance"]); const b = profile(2, ["romance"]); const c = profile(3, ["romance"]);
  a.details.romance = { genders: ["Non-binary"], sexualities: ["Queer"], interested_in: [] };
  b.details.romance = { genders: ["Woman"], sexualities: ["Queer"], interested_in: ["Non-binary"] };
  const result = bestMatches([a, b, c]);
  expect(result).toHaveLength(1);
  expect(result[0].sharedSexualities).toEqual(["Queer"]);
  expect(bestMatches([a, c])).toHaveLength(1);
});

it("romance mode checks sexuality preferences mutually and requires completed identities", () => {
  const a = profile(1, ["romance", "friendship"]); const b = profile(2, ["romance", "friendship"]);
  expect(bestMatches([a, b], undefined, { romantic: true })).toEqual([]);
  a.details.romance = { genders: ["Woman"], sexualities: ["Bisexual"], interested_in: ["Woman"], interested_sexualities: ["Queer", "Bisexual"] };
  b.details.romance = { genders: ["Woman"], sexualities: ["Queer"], interested_in: ["Woman"], interested_sexualities: ["Lesbian"] };
  expect(bestMatches([a, b], undefined, { romantic: true })).toEqual([]);
  b.details.romance.interested_sexualities = ["Bisexual"];
  expect(bestMatches([a, b], undefined, { romantic: true })).toHaveLength(1);
  b.details.open_to = ["friendship"];
  expect(bestMatches([a, b], undefined, { romantic: true })).toEqual([]);
});

it("can match people open to romance without applying the secondary preference filter", () => {
  const a = profile(1, ["romance"]); const b = profile(2, ["romance"]);
  expect(bestMatches([a, b], undefined, { romantic: true, romanticPreferences: false })).toHaveLength(1);
  expect(bestMatches([a, b], undefined, { romantic: true, romanticPreferences: true })).toEqual([]);
  b.details.open_to = ["friendship"];
  expect(bestMatches([a, b], undefined, { romantic: true, romanticPreferences: false })).toEqual([]);
});

it("includes odd people using one additional pair and avoids prior pairs when possible", () => {
  const profiles = [1, 2, 3, 4, 5].map(id => profile(id, ["friendship"]));
  const first = pairEveryone(profiles, undefined, {}, () => 0);
  expect(first.pairs).toHaveLength(3);
  expect(first.unpaired).toHaveLength(0);
  const ids = first.pairs.flatMap(pair => [pair.first.person.id, pair.second.person.id]);
  expect(new Set(ids).size).toBe(5);
  const seen = new Set(first.pairs.map(pair => [pair.first.person.id, pair.second.person.id].sort((a, b) => a - b).join(":")));
  const next = pairEveryone(profiles, undefined, { seen }, () => 0);
  expect(next.pairs.every(pair => !seen.has([pair.first.person.id, pair.second.person.id].sort((a, b) => a - b).join(":")))).toBe(true);
});

it("includes everyone with labeled general introductions when filters cannot be met", () => {
  const profiles = [1, 2, 3, 4].map(id => profile(id, ["friendship"]));
  const result = pairEveryone(profiles, undefined, { romantic: true }, () => 0);
  expect(result.pairs).toHaveLength(2);
  expect(result.unpaired).toEqual([]);
  expect(result.pairs.every(pair => pair.fallback && !pair.shared.includes("romance"))).toBe(true);
});

it("never repeats exhausted pairs through fallback introductions", () => {
  const people = [1, 2, 3].map(id => profile(id, ["friendship"]));
  const result = pairEveryone(people, undefined, { seen: new Set(["1:2", "1:3", "2:3"]) }, () => 0);
  expect(result.pairs).toEqual([]);
  expect(result.unpaired).toHaveLength(3);
});
it("leaves the odd person unpaired when all their previous partners are exhausted", () => {
  const people = [1, 2, 3].map(id => profile(id, ["friendship"]));
  const result = pairEveryone(people, undefined, { seen: new Set(["1:3", "2:3"]) }, () => 0);
  expect(result.pairs).toHaveLength(1);
  expect(result.unpaired.map(person => person.person.id)).toEqual([3]);
});

it("pairs rare shared preferences before more common preferences with greater overlap", () => {
  const people = [profile(1, ["employment"]), profile(2, ["employment"]), ...[3, 4, 5, 6].map(id => profile(id, ["friendship", "conversation"]))];
  const result = pairEveryone(people, undefined, {}, () => 0);
  expect(result.pairs[0].shared).toEqual(["employment"]);
});
it("recognizes rare combinations and uses overlap within equally rare groups", () => {
  const people = [profile(1, ["friendship", "conversation"]), profile(2, ["friendship", "conversation"]), profile(3, ["friendship"]), profile(4, ["conversation"]), profile(5, ["employment"]), profile(6, ["employment"])];
  const result = pairEveryone(people, undefined, {}, () => 0);
  expect(result.pairs[0].shared).toEqual(["friendship", "conversation"]);
});
it("excludes historical pairs before ranking scarcity", () => {
  const people = [profile(1, ["employment"]), profile(2, ["employment"]), ...[3, 4, 5, 6].map(id => profile(id, ["friendship"]))];
  const result = pairEveryone(people, undefined, { seen: new Set(["1:2"]) }, () => 0);
  expect(result.pairs[0].shared).toEqual(["friendship"]);
  expect(result.pairs.some(pair => [pair.first.person.id, pair.second.person.id].sort().join(":") === "1:2")).toBe(false);
});
