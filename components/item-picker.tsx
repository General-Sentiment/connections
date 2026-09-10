"use client";
import { useEffect, useRef, useState } from "react";
import type { Item } from "@/lib/types";
import { CardFace } from "./card";
import { itemKey } from "@/lib/urls";

export function ItemPicker({ selected, onChange, onClose, onReplace }: { selected: Item[]; onChange: (items: Item[]) => void; onClose: () => void; onReplace?: (item: Item) => void }) {
  const dialog = useRef<HTMLDialogElement>(null); const [type, setType] = useState<"Block" | "Channel">("Block"); const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]); const [page, setPage] = useState(1); const [next, setNext] = useState<number | null>(null); const [scope, setScope] = useState(""); const [busy, setBusy] = useState(true); const [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); return () => dialog.current?.close(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true); setError("");
    const timer = setTimeout(async () => { try {
      const params = new URLSearchParams({ type, page: String(page), q }); if (q.startsWith("https://")) params.set("url", q);
      const r = await fetch(`/api/items?${params}`, { signal: controller.signal }); const data = await r.json(); if (!r.ok) throw new Error(data.error);
      if (controller.signal.aborted) return;
      setItems(previous => page > 1 ? Array.from(new Map([...previous, ...data.data].map(x => [itemKey(x), x])).values()) : data.data); setNext(data.meta?.next_page || null); setScope(data.scope || "");
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Could not load items."); } finally { if (!controller.signal.aborted) setBusy(false); } }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [type, q, page]);
  return <dialog ref={dialog} className="picker-dialog" onCancel={onClose} onClick={event => { if (event.target === dialog.current) onClose(); }} aria-labelledby="picker-title"><div className="picker-body"><div className="dialog-heading"><h2 id="picker-title">Connect <span className="picker-count">({selected.length + (onReplace ? 1 : 0)} of 3 selected)</span></h2><button type="button" className="icon" onClick={onClose} aria-label="Close picker">×</button></div><div className="picker-search-row"><input autoFocus className="search-input" aria-label="Search your creations" placeholder="Search by name or paste an Are.na URL" value={q} onChange={e => { setBusy(true); setQ(e.target.value); setPage(1); }} /><div className="picker-toggle" role="group" aria-label="Content type">{(["Block", "Channel"] as const).map(t => <button key={t} type="button" className={type === t ? "active" : undefined} aria-pressed={type === t} onClick={() => { if (t !== type) { setBusy(true); setType(t); setPage(1); } }}>{t}s</button>)}</div></div><div className="picker-results" aria-busy={busy}>{busy ? <div className="picker-loading" role="status"><span className="loading-spinner" aria-hidden />loading</div> : <>{scope && <p className="small muted" aria-live="polite">{scope}</p>}{error && <p className="error" role="alert">{error}</p>}<div className="picker-grid">{items.map(item => {
    const checked = selected.some(x => itemKey(x) === itemKey(item)); return <button key={itemKey(item)} type="button" className={`picker-item ${checked ? "selected" : ""}`} aria-pressed={checked} aria-label={`${checked ? "Remove" : "Select"} ${item.title || "Untitled"}`} disabled={onReplace ? checked : !checked && selected.length >= 3} onClick={() => onReplace ? onReplace(item) : onChange(checked ? selected.filter(x => itemKey(x) !== itemKey(item)) : [...selected, item])}><CardFace item={item} />{item.type !== "Channel" && <span className="picker-title">{item.title || "Untitled"}</span>}{checked && <span className="selection-mark">✓</span>}</button>;
  })}</div>{!busy && !items.length && !error && <p className="empty">No items found.</p>}{next && <button type="button" disabled={busy} onClick={() => { setBusy(true); setPage(next!); }}>Load more</button>}</>}</div><div className="dialog-footer"><button type="button" onClick={onClose}>Done →</button></div></div></dialog>;
}
