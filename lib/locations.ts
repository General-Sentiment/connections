import { z } from "zod";
import type { Metadata } from "./types";

export const locationSchema = z.object({
  city: z.string().trim().min(1).max(100), country: z.string().trim().min(1).max(100),
  id: z.string().regex(/^osm:[NWR]:\d+$/).optional(),
  region: z.string().trim().max(100).optional(),
  country_code: z.string().regex(/^[A-Z]{2}$/).optional(),
}).strict().refine(value => !value.id || Boolean(value.country_code), "Choose a city from the suggestions.");
export type Location = z.infer<typeof locationSchema>;
const countryCodes = new Map<string, string>();
const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
  const code = String.fromCharCode(a, b); const name = displayNames.of(code);
  if (name && name !== code) countryCodes.set(name.toLowerCase(), code);
}
export function locationMetadata(location: Location): Metadata {
  return { location_id: location.id || null, location_city: location.city, location_region: location.region || null, location_country: location.country_code || countryCodes.get(location.country.toLowerCase()) || location.country };
}
export function locationMatches(metadata: Metadata | null | undefined, country: string, city: string) {
  return (!country || metadata?.location_country === country) && (!city || metadata?.location_id === city);
}
export function locationSearchQuery(query: string) {
  return /^(nyc|new york city)$/i.test(query.trim()) ? "New York" : query.trim();
}
export function countryName(code: string) { return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code; }
