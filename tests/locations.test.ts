import { describe, expect, it } from "vitest";
import { locationSchema, locationMetadata, locationMatches, locationSearchQuery } from "../lib/locations";
import { parseDetails, serializeDetails } from "../lib/details";

describe("normalized locations", () => {
  it("uses the same lookup for NYC and New York City", () => {
    expect(locationSearchQuery("NYC")).toBe("New York");
    expect(locationSearchQuery(" New York City ")).toBe("New York");
    expect(locationSearchQuery("Paris")).toBe("Paris");
  });
  it("round trips normalized locations through the existing details block", () => {
    const details = { schema: "connections_profile" as const, version: 1 as const, location: { city: "New York", country: "United States", id: "osm:R:175905", region: "New York", country_code: "US" }, open_to: ["friendship" as const], local_only: false };
    expect(parseDetails(serializeDetails(details))).toEqual(details);
  });
  it("accepts legacy locations and clears obsolete normalized metadata", () => {
    const legacy = locationSchema.parse({ city: "NYC", country: "United States" });
    expect(locationMetadata(legacy)).toEqual({ location_id: null, location_city: "NYC", location_region: null, location_country: "US" });
  });
  it("matches identifiers rather than ambiguous city names", () => {
    const metadata = { location_id: "osm:R:175905", location_country: "US" };
    expect(locationMatches(metadata, "US", "osm:R:175905")).toBe(true);
    expect(locationMatches(metadata, "FR", "osm:R:175905")).toBe(false);
    expect(locationMatches(metadata, "US", "osm:R:999")).toBe(false);
    expect(locationMatches({}, "", "")).toBe(true);
    expect(locationMatches({}, "US", "")).toBe(false);
  });
  it("requires a country code for normalized IDs", () => {
    expect(locationSchema.safeParse({ city: "Paris", country: "France", id: "osm:R:1" }).success).toBe(false);
  });
});
