"use client";
import { useState } from "react";
import type { Item } from "@/lib/types";
import { Card } from "./card";
export function RecentProfileItems({ user, type, initial, initialError, demo }: { user: number; type: "Block" | "Channel"; initial: Item[]; initialError: string; demo: boolean }) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  async function randomize() {
    setBusy(true); setError("");
    try {
      let pool = initial;
      if (!demo) {
        const response = await fetch(`/api/people/random?user=${user}&type=${type}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load items.");
        pool = data.data;
      }
      const shuffled = [...pool];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const fresh = shuffled.filter(item => !items.some(current => current.id === item.id));
      setItems([...fresh, ...shuffled.filter(item => items.some(current => current.id === item.id))].slice(0, 4));
    } catch (error) { setError(error instanceof Error ? error.message : "Could not load items."); }
    finally { setBusy(false); }
  }
  return <section className="content-section recent-blocks-section">
    <div className="recent-section-heading"><h2>Recent {type === "Block" ? "blocks" : "channels"}</h2><button type="button" onClick={randomize} disabled={busy}>Randomize<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h2c4 0 6 12 10 12h6m-4-4 4 4-4 4M3 18h2c2 0 3-2 4.5-4.5M11.5 10.5C13 8 13 6 15 6h6m-4-4 4 4-4 4" /></svg></button></div>
    {error && <p className="notice error" role="alert">{error}</p>}
    <div className="grid recent-grid" aria-busy={busy}>{items.map(item => <Card key={item.id} item={item} />)}</div>
    {!items.length && !error && <p className="empty">No public items yet.</p>}
  </section>;
}
