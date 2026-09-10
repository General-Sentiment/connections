import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { apiError, privateJson } from "@/lib/http";
import { locationSchema, locationSearchQuery, countryName } from "@/lib/locations";

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const q = request.nextUrl.searchParams.get("q")?.trim() || "";
    if (q.length < 2 || q.length > 100) return privateJson({ locations: [] });
    const url = new URL("/api/", process.env.PHOTON_URL || "https://photon.komoot.io");
    url.search = new URLSearchParams({ q: locationSearchQuery(q), limit: "6", lang: "en", layer: "city" }).toString();
    const response = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("City suggestions are unavailable. Try again shortly.");
    const data = await response.json();
    const locations = new Map();
    for (const feature of data.features || []) {
      const p = feature.properties;
      const code = p.countrycode?.toUpperCase();
      if (!code || !p.name || p.type !== "city") continue;
      const parsed = locationSchema.safeParse({ id: `osm:${p.osm_type}:${p.osm_id}`, city: p.name, region: p.state || "", country: countryName(code), country_code: code });
      if (parsed.success) locations.set(parsed.data.id, parsed.data);
    }
    return privateJson({ locations: [...locations.values()] });
  } catch (e) { return apiError(e); }
}
