"use client";
import { useOptimistic, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
export type LocationOption = { id: string; city: string; region: string; country: string; countryLabel: string };
export function DirectoryLocation({ locations, country, city }: { locations: LocationOption[]; country: string; city: string }) {
  const params = useSearchParams(); const router = useRouter(); const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useOptimistic({ country, city });
  const countries = [...new Map(locations.map(place => [place.country, place.countryLabel])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const cities = locations.filter(place => place.id && (!active.country || place.country === active.country)).sort((a, b) => a.city.localeCompare(b.city));
  function update(country: string, city: string) {
    startTransition(() => {
      setActive({ country, city });
      const query = new URLSearchParams(params.toString()); query.delete("page");
      if (country) query.set("country", country); else query.delete("country");
      if (city) query.set("city", city); else query.delete("city");
      router.push(`${pathname}?${query}`, { scroll: false });
    });
  }
  return <div className="directory-location" aria-busy={pending}>
    <LocationMenu label="Country" allLabel="All countries" value={active.country} options={countries.map(([value, label]) => ({ value, label }))} onChange={value => update(value, "")} />
    <LocationMenu label="City" allLabel="All cities" value={active.city} options={cities.map(place => ({ value: place.id, label: [place.city, place.region, !active.country && place.countryLabel].filter(Boolean).join(", ") }))} onChange={value => update(active.country, value)} />
  </div>;
}

function LocationMenu({ label, allLabel, value, options, onChange }: { label: string; allLabel: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <label className="location-filter">
    <span className="location-filter-label">{label}</span>
    <span className="location-select-wrap">
      <select value={value} onChange={event => onChange(event.target.value)}>
        <option value="">{allLabel}</option>
        {value && !options.some(option => option.value === value) && <option value={value}>Selected {label.toLowerCase()}</option>}
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <svg width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true"><path d="m1 1 5 5 5-5" stroke="currentColor" /></svg>
    </span>
  </label>;
}
