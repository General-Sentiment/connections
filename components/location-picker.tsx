"use client";
import { useEffect, useId, useState } from "react";
import type { Location } from "@/lib/locations";

export function LocationPicker({ value, onChange }: { value: Location; onChange: (value: Location) => void }) {
  const [query, setQuery] = useState(value.city);
  const [options, setOptions] = useState<Location[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = useId();
  useEffect(() => {
    if (!searching || query.trim().length < 2) { setOptions([]); setBusy(false); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true); setError("");
      try {
        const response = await fetch(`/api/locations?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!controller.signal.aborted) setOptions(data.locations);
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Could not find cities."); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, searching]);
  return <div className="location-picker" aria-busy={busy}>
    <label className="field" htmlFor={id}>City<input id={id} autoComplete="off" required maxLength={100} value={query} onChange={e => { setQuery(e.target.value); setOptions([]); setSearching(true); onChange({ city: e.target.value, country: value.country }); }} onKeyDown={e => { if (e.key === "Escape") { setSearching(false); setOptions([]); } }} aria-describedby={`${id}-help`} /></label>
    {searching && options.length > 0 && <ul className="location-suggestions" aria-label="City suggestions">{options.map(option => <li key={option.id}><button type="button" onClick={() => { onChange(option); setQuery(option.city); setSearching(false); setOptions([]); }}>{[option.city, option.region, option.country].filter(Boolean).join(", ")}</button></li>)}</ul>}
    <p id={`${id}-help`} className="small muted">{value.id ? [value.region, value.country].filter(Boolean).join(", ") : "Choose a suggested city so people can find you by location."}</p>
    {error && <p role="status" className="small muted">{error} You can keep your typed location.</p>}
  </div>;
}
