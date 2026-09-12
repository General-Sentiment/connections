"use client";
import { usePickerDialog } from "./use-picker-dialog";
import { useEffect, useRef, useState } from "react";
import type { Item } from "@/lib/types";
import type { ProfilePrompt } from "@/lib/prompts";
import { CardFace } from "./card";
import { SelectionPrompt } from "./selection-prompt";
import { itemKey, pastedArenaUrl } from "@/lib/urls";

export function ItemPicker({ selected, onChange, onClose, onReplace, prompt, onRemix, remixDisabled }: { selected: Item[]; onChange: (items: Item[]) => void; onClose: () => void; onReplace?: (item: Item) => void; prompt?: ProfilePrompt; onRemix?: () => void; remixDisabled?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [type, setType] = useState<"Block" | "Channel">("Block"); const [q, setQ] = useState("");
  const [trail, setTrail] = useState<Item[]>([]); const channel = trail.at(-1);
  const [items, setItems] = useState<Item[]>([]); const [page, setPage] = useState(1); const [next, setNext] = useState<number | null>(null); const [scope, setScope] = useState(""); const [busy, setBusy] = useState(true); const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  usePickerDialog(dialog);
  useEffect(() => {
    const controller = new AbortController(); setBusy(true); setError("");
    const timer = setTimeout(async () => { try {
      const params = new URLSearchParams({ type, page: String(page), q });
      const url = pastedArenaUrl(q);
      if (url) params.set("url", url);
      if (channel) params.set("channel", String(channel.id));
      const r = await fetch(`/api/items?${params}`, { signal: controller.signal }); const data = await r.json(); if (!r.ok) throw new Error(data.error);
      if (controller.signal.aborted) return;
      setItems(previous => page > 1 ? Array.from(new Map([...previous, ...data.data].map(x => [itemKey(x), x])).values()) : data.data); setNext(data.meta?.next_page || null); setScope(data.scope || "");
    } catch (e) { if (!controller.signal.aborted) { if (page === 1) { setItems([]); setNext(null); setScope(""); } setError(e instanceof Error ? e.message : "Could not load items."); } } finally { if (!controller.signal.aborted) setBusy(false); } }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [type, q, page, channel, retry]);
  function navigate(nextTrail: Item[]) { setBusy(true); setTrail(nextTrail); setQ(""); setPage(1); }
  return <dialog ref={dialog} className="picker-dialog" onCancel={onClose} onClick={event => { if (event.target === dialog.current) onClose(); }} aria-label="Choose a block or channel"><div className="picker-body">
    <SelectionPrompt prompt={prompt} onRemix={onRemix} onClose={onClose} disabled={remixDisabled} />
    <div className="picker-search-row"><input autoFocus className="search-input" aria-label={channel ? "Search this channel" : "Search your blocks and channels"} placeholder={channel ? "Search this channel or paste an Are.na URL" : "Search by name or paste an Are.na URL"} value={q} onChange={e => { setBusy(true); setQ(e.target.value); setPage(1); }} /><div className="picker-toggle" role="group" aria-label="Content type">{(["Block", "Channel"] as const).map(t => <button key={t} type="button" className={type === t && !channel ? "active" : undefined} aria-pressed={type === t && !channel} onClick={() => { setType(t); navigate([]); }}>{t}s</button>)}</div></div>
    {channel && <div className="picker-channel-nav"><button type="button" className="quiet" onClick={() => navigate(trail.slice(0, -1))}>← Back</button><span>{channel.title || "Untitled channel"}</span></div>}
    <p className="sr-only" role="status">{busy ? "Loading items…" : error ? "Items could not be loaded." : `${items.length} items available.`}</p>
    <div className="picker-results" aria-busy={busy}>{busy && page === 1 ? <div className="picker-loading" role="status" aria-label="Loading"><span className="loading-spinner" aria-hidden /></div> : <>{scope && <p className="small muted" aria-live="polite">{scope}</p>}{error && <p className="error" role="alert">{error}</p>}<div className="picker-grid">{items.map(item => {
      const checked = selected.some(x => itemKey(x) === itemKey(item));
      return <button key={itemKey(item)} type="button" className={`picker-item ${checked ? "selected" : ""}`} aria-pressed={checked} aria-label={`${checked ? "Selected" : "Select"} ${item.title || "Untitled"}`} disabled={Boolean(onReplace && checked)} onClick={() => { if (onReplace) onReplace(item); else onChange(checked ? selected.filter(x => itemKey(x) !== itemKey(item)) : [...selected, item]); }}><CardFace item={item} /><span className="picker-title">{item.title || "Untitled"}</span>{checked && <span className="selection-mark">✓</span>}</button>;
    })}</div>{!items.length && !error && <p className="empty">No items found.</p>}{next && <div className="picker-load-more"><button type="button" disabled={busy} onClick={() => { setBusy(true); if (error) setRetry(value => value + 1); else setPage(next); }}>{busy ? "Loading…" : error ? "Retry" : "Load more"}</button></div>}</>}</div>
  </div></dialog>;
}
