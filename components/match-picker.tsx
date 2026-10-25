"use client";
import { publishPlotProgress } from "@/lib/plot-progress";
import { broadcastPlotUpdate } from "@/lib/plot-broadcast";

import { useEffect, useRef, useState } from "react";
import { pairEveryone, bestMatches, matchKey, type LocationLevel, type Match } from "@/lib/matching";
import { intentions } from "@/lib/details";
import type { Profile } from "@/lib/types";
import { fetchMatchProfiles } from "@/lib/fetch-match-profiles";
import { PairingTable } from "./pairing-table";
import { ProfileCard } from "./profile-card";

export function MatchPicker({ selfId, everyone = false, publishPlot = false }: { selfId?: number; everyone?: boolean; publishPlot?: boolean }) {
  const [batch, setBatch] = useState<ReturnType<typeof pairEveryone>>();
  useEffect(() => {
    if (!publishPlot) return;
    const clear = () => setBatch(undefined);
    window.addEventListener("plot-round-selected", clear);
    return () => window.removeEventListener("plot-round-selected", clear);
  }, [publishPlot]);
  const [answeredActivePromptOnly, setAnsweredActivePromptOnly] = useState(true);
  const [romanticPreferences, setRomanticPreferences] = useState(true);
  const [romantic, setRomantic] = useState(false);
  const [onlyMe, setOnlyMe] = useState(false);
  const seenRef = useRef(new Set<string>());
  const historyKey = `connections:match-history:${selfId ?? "guest"}`;
  const profilesRef = useRef<Profile[] | null>(null);
  const busy = useRef(false);
  const [progress, setProgress] = useState("");
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!loading) return;
    const started = Date.now(); setElapsed(0);
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [loading]);
  useEffect(() => {
    if (!publishPlot || !loading) return;
    const report = () => publishPlotProgress(progress || "Loading profiles and preferences…");
    report();
    const timer = setInterval(report, 5000);
    return () => { clearInterval(timer); publishPlotProgress(null); };
  }, [publishPlot, loading, progress]);
  const counts = progress.match(/(\d+) of (\d+) profiles/);
  const [error, setError] = useState("");
  const [skipped, setSkipped] = useState(0);
  const [requireLocation, setRequireLocation] = useState(false);
  const [level, setLevel] = useState<LocationLevel>("city");
  const [match, setMatch] = useState<Match | null | undefined>();
  async function findMatch() {
    if (busy.current) return;
    busy.current = true;
    setBatch(undefined);
    setLoading(true); setError(""); setProgress("Loading profiles and preferences…");
    const minimum = new Promise<void>(resolve => setTimeout(resolve, 5000));
    try {
      const load = async () => {
        if (profilesRef.current && !publishPlot) { setProgress("Finding a pair…"); return profilesRef.current; }
        const result = await fetchMatchProfiles(setProgress);
        profilesRef.current = result.profiles;
        setSkipped(result.skipped);
        return result.profiles as Profile[];
      };
      const [profiles] = await Promise.all([load(), minimum]);
      if (!publishPlot && profiles.length < 2) {
        setMatch(undefined);
        setError("At least two published profiles are needed to find a pair.");
        return;
      }
      if (onlyMe && !profiles.some(profile => profile.person.id === selfId)) {
        setMatch(undefined);
        setError("Publish a visible profile before pairing yourself.");
        return;
      }
      try {
        const stored: unknown = JSON.parse(sessionStorage.getItem(historyKey) || "[]");
        if (Array.isArray(stored)) for (const key of stored) if (typeof key === "string") seenRef.current.add(key);
      } catch { /* Keep in-memory history when browser storage is unavailable. */ }
      if (everyone) {
        let result: ReturnType<typeof pairEveryone>;
        if (publishPlot) {
          setProgress("Saving the round and revealing pairings on Plot…");
          const response = await fetch("/api/plot/pairings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(requireLocation ? { location: level } : {}), romantic, romanticPreferences, answeredActivePromptOnly }) });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "The Plot round could not be published.");
          result = { pairs: data.pairs, unpaired: data.unpaired };
          setSkipped(data.skipped || 0);
          broadcastPlotUpdate();
          window.dispatchEvent(new Event("plot-round-published"));
        } else result = pairEveryone(profiles, requireLocation ? level : undefined, { seen: seenRef.current, romantic, romanticPreferences });
        for (const pair of result.pairs) seenRef.current.add(matchKey(pair.first.person.id, pair.second.person.id));
        try { sessionStorage.setItem(historyKey, JSON.stringify([...seenRef.current])); } catch { /* Keep in-memory history. */ }
        setBatch(result);
        return;
      }
      const pool = bestMatches(profiles, requireLocation ? level : undefined, { selfId: onlyMe ? selfId : undefined, seen: seenRef.current, romantic, romanticPreferences });
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
      setError(cause instanceof Error ? cause.message : "Pairing failed. Try again.");
    } finally {
      busy.current = false; setLoading(false);
    }
  }
  return <>
    <p className="muted pair-introduction">{everyone ? "Pair rare shared “Open to” preferences and combinations first, then prioritize the amount of overlap. Fallback introductions are labeled; with an odd count, one person may participate twice." : "Pair two people with the most shared “Open to” preferences."} Equally strong pairs are picked at random. {everyone ? "Previous pairs are never repeated. People with no new partner remain unpaired." : "Pairs won’t repeat during this session."}</p>
    {publishPlot && <p className="small muted">Pair saves and reveals a round on Plot. {answeredActivePromptOnly ? "Only people who answered the active prompt are included." : "Everyone with a published, visible profile is included."}</p>}
    <form className="match-controls" onSubmit={event => { event.preventDefault(); findMatch(); }}>

      {publishPlot && <fieldset className="match-location-options" disabled={loading}><legend>Pairing pool</legend><div>{[{ value: true, label: "Answered the active prompt" }, { value: false, label: "Everyone" }].map(option => <label className="check" key={option.label}><input type="radio" name="plot-pairing-pool" checked={answeredActivePromptOnly === option.value} onChange={() => { setAnsweredActivePromptOnly(option.value); setBatch(undefined); setError(""); }} />{option.label}</label>)}</div></fieldset>}
      {!everyone && <label className="check"><input type="checkbox" disabled={loading || selfId === undefined} checked={onlyMe} onChange={event => { setOnlyMe(event.target.checked); setMatch(undefined); setError(""); }} />Only pair me</label>}
      <label className="check"><input type="checkbox" disabled={loading} checked={romantic} onChange={event => { setRomantic(event.target.checked); setMatch(undefined); setError(""); }} />Pair for romance</label>
      {romantic && <div className="pair-romance-options"><label className="check"><input type="checkbox" disabled={loading} checked={romanticPreferences} onChange={event => { setRomanticPreferences(event.target.checked); setMatch(undefined); setError(""); }} />Pair based on romantic preferences</label><p className="small muted">{romanticPreferences ? "Requires gender and sexuality details and mutual compatibility with both people’s Interested in selections." : "Pairs people who are open to romance, without filtering by gender, sexuality, or Interested in selections."}</p></div>}
      <label className="check"><input type="checkbox" disabled={loading} checked={requireLocation} onChange={event => { setRequireLocation(event.target.checked); setMatch(undefined); }} />Require the same location</label>
      <fieldset className="match-location-options" disabled={loading || !requireLocation}><legend>Pair location by</legend><div>{([['city', 'City'], ['state', 'State / region'], ['country', 'Country']] as const).map(([value, label]) => <label className="check" key={value}><input type="radio" name="match-location-level" value={value} checked={level === value} onChange={() => { setLevel(value); setMatch(undefined); setError(""); }} />{label}</label>)}</div></fieldset>
      <button type="submit" disabled={loading}>{loading ? "Pairing…" : "Pair"}</button>
      <p className="small muted">People who selected “local only” are always paired within their city. Missing location details don’t count as a shared location.</p>
    </form>
    <div aria-live="polite" aria-busy={loading}>
      {loading && <div className="pair-loading" role="status"><p>Pairing… <span className="muted">{elapsed}s elapsed</span></p><p className="muted">{progress}</p>{counts ? <progress aria-label="Profiles checked" value={Number(counts[1])} max={Number(counts[2])} /> : <progress aria-label="Loading profiles" />}<p className="small muted">The first scan loads everyone’s preferences from Are.na. Later rounds reuse loaded profiles.</p></div>}
      {error && <p role="alert" className="notice error">{error}</p>}
      {!loading && skipped > 0 && <p className="small muted">{skipped} unavailable or private {skipped === 1 ? "profile was" : "profiles were"} left out. Readable profiles with missing preferences can receive general introductions.</p>}
      {!loading && match === null && <p className="empty">No eligible pairs found. Try a broader location or turn off the location requirement.</p>}
      {!publishPlot && !loading && batch && <PairingTable pairs={batch.pairs} unpaired={batch.unpaired} location={requireLocation ? level === "state" ? "state / region" : level : undefined} romanticPreferences={romantic && romanticPreferences} />}
      {!loading && match && <section aria-label="Selected pair"><h2>{match.shared.length} shared {match.shared.length === 1 ? "preference" : "preferences"}</h2><p>{match.shared.length ? intentions.filter(([value]) => match.shared.includes(value)).map(([, label]) => label).join(" · ") : "No shared preferences yet — this pair was chosen at random."}</p>{Boolean(match.sharedSexualities?.length) && <p className="small muted">Shared sexuality: {match.sharedSexualities!.join(", ")}</p>}<div className="match-pair">{[match.first, match.second].map(profile => <div key={profile.person.id}><ProfileCard item={profile.channel} profile={profile} /><p className="small muted">{[profile.details.location.city, profile.details.location.region, profile.details.location.country].filter(Boolean).join(", ")}</p></div>)}</div></section>}
    </div>
  </>;
}
