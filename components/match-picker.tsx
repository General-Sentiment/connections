"use client";

import { useRef, useState } from "react";
import { bestMatches, matchKey, type LocationLevel, type Match } from "@/lib/matching";
import { intentions } from "@/lib/details";
import type { Profile } from "@/lib/types";
import { fetchMatchProfiles } from "@/lib/fetch-match-profiles";
import { ProfileCard } from "./profile-card";

export function MatchPicker({ selfId }: { selfId?: number }) {
  const [romantic, setRomantic] = useState(false);
  const [onlyMe, setOnlyMe] = useState(false);
  const seenRef = useRef(new Set<string>());
  const historyKey = `connections:match-history:${selfId ?? "guest"}`;
  const profilesRef = useRef<Profile[] | null>(null);
  const busy = useRef(false);
  const [progress, setProgress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [skipped, setSkipped] = useState(0);
  const [requireLocation, setRequireLocation] = useState(false);
  const [level, setLevel] = useState<LocationLevel>("city");
  const [match, setMatch] = useState<Match | null | undefined>();
  async function findMatch() {
    if (busy.current) return;
    busy.current = true;
    setLoading(true); setError(""); setProgress("Loading profiles and preferences…");
    const minimum = new Promise<void>(resolve => setTimeout(resolve, 5000));
    try {
      const load = async () => {
        if (profilesRef.current) { setProgress("Finding a pair…"); return profilesRef.current; }
        const result = await fetchMatchProfiles(setProgress);
        profilesRef.current = result.profiles;
        setSkipped(result.skipped);
        return result.profiles as Profile[];
      };
      const [profiles] = await Promise.all([load(), minimum]);
      if (profiles.length < 2) {
        setMatch(undefined);
        setError("At least two published profiles are needed to find a pair.");
        return;
      }
      if (onlyMe && !profiles.some(profile => profile.person.id === selfId)) {
        setMatch(undefined);
        setError("Publish a visible profile before matching yourself.");
        return;
      }
      try {
        const stored: unknown = JSON.parse(sessionStorage.getItem(historyKey) || "[]");
        if (Array.isArray(stored)) for (const key of stored) if (typeof key === "string") seenRef.current.add(key);
      } catch { /* Keep in-memory history when browser storage is unavailable. */ }
      const pool = bestMatches(profiles, requireLocation ? level : undefined, { selfId: onlyMe ? selfId : undefined, seen: seenRef.current, romantic });
      if (!pool.length) {
        setMatch(undefined);
        setError("No unseen eligible pairs remain for these settings. Try changing your filters.");
        return;
      }
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      seenRef.current.add(matchKey(chosen.first.person.id, chosen.second.person.id));
      try { sessionStorage.setItem(historyKey, JSON.stringify([...seenRef.current])); } catch { /* In-memory history still prevents repeats. */ }
      setMatch(chosen);
    } catch (cause) {
      await minimum;
      setMatch(undefined);
      setError(cause instanceof Error ? cause.message : "Matching failed. Try again.");
    } finally {
      busy.current = false; setLoading(false);
    }
  }
  return <>
    <p className="muted">Pair two people with the most shared “Open to” preferences. Equally strong pairs are picked at random. Pairs won’t repeat during this browser session.</p>
    <form className="match-controls" onSubmit={event => { event.preventDefault(); findMatch(); }}>
      <label className="check"><input type="checkbox" disabled={loading || selfId === undefined} checked={onlyMe} onChange={event => { setOnlyMe(event.target.checked); setMatch(undefined); setError(""); }} />Only match me</label>
      <label className="check"><input type="checkbox" disabled={loading} checked={romantic} onChange={event => { setRomantic(event.target.checked); setMatch(undefined); setError(""); }} />Match for romance</label>
      {romantic && <p className="small muted">Both people must be open to romance and have completed their gender and sexuality details. Both people’s gender and sexuality preferences must be satisfied. Combine with “Only match me” to use your preferences.</p>}
      <label className="check"><input type="checkbox" disabled={loading} checked={requireLocation} onChange={event => { setRequireLocation(event.target.checked); setMatch(undefined); }} />Require the same location</label>
      <label className="field">Match location by<select value={level} disabled={loading || !requireLocation} onChange={event => { setLevel(event.target.value as LocationLevel); setMatch(undefined); }}><option value="city">City</option><option value="state">State / region</option><option value="country">Country</option></select></label>
      <button type="submit" disabled={loading}>{loading ? "Matching…" : "Match"}</button>
      <p className="small muted">People who selected “local only” are always paired within their city. Missing location details don’t count as a shared location.</p>
    </form>
    <div aria-live="polite" aria-busy={loading}>
      {loading && <p role="status" className="muted">Matching… {progress}</p>}
      {error && <p role="alert" className="notice error">{error}</p>}
      {!loading && skipped > 0 && <p className="small muted">Some unavailable or incomplete profiles were left out of matching.</p>}
      {!loading && match === null && <p className="empty">No eligible pairs found. Try a broader location or turn off the location requirement.</p>}
      {!loading && match && <section aria-label="Matched pair"><h2>{match.shared.length} shared {match.shared.length === 1 ? "preference" : "preferences"}</h2><p>{match.shared.length ? intentions.filter(([value]) => match.shared.includes(value)).map(([, label]) => label).join(" · ") : "No shared preferences yet — this pair was chosen at random."}</p>{Boolean(match.sharedSexualities?.length) && <p className="small muted">Shared sexuality: {match.sharedSexualities!.join(", ")}</p>}<div className="match-pair">{[match.first, match.second].map(profile => <div key={profile.person.id}><ProfileCard item={profile.channel} profile={profile} /><p className="small muted">{[profile.details.location.city, profile.details.location.region, profile.details.location.country].filter(Boolean).join(", ")}</p></div>)}</div></section>}
    </div>
  </>;
}
