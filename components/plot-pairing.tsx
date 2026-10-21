"use client";
import { broadcastPlotUpdate, subscribePlotUpdates } from "@/lib/plot-broadcast";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "./card";
import { SelectionPrompt } from "./selection-prompt";
import { ResponseText } from "./response-text";
import type { Item } from "@/lib/types";
import type { ProfilePrompt } from "@/lib/prompts";
import { PersonProfileCard } from "./profile-card";
import { intentions } from "@/lib/details";
type Pairing = { runId: number | null; checkedIn: boolean; partners: { user_id: number; profile_id: number; name: string; photo?: string | null; shared: string[]; answers?: { item: Item; prompt: ProfilePrompt; description: string }[] | null; note?: string }[] };
export function PlotPairing({ mode }: { mode: "ready" | "pairing" }) {
  const router = useRouter();
  const [pairing, setPairing] = useState<Pairing>();
  const [checkingIn, setCheckingIn] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let stopped = false; let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    let inFlight = false;
    let pendingFocus = false;
    async function refresh(fresh = false) {
      if (inFlight || stopped) return;
      let delay = 15000;
      if (document.visibilityState === "hidden") { timer = setTimeout(refresh, delay); return; }
      inFlight = true;
      try {
        const response = await fetch(`/api/plot/pairings${fresh ? "?refresh=true" : ""}`, { cache: "no-store", signal: controller.signal });
        if (response.status === 429) delay = Math.max(delay, (Number(response.headers.get("Retry-After")) || 60) * 1000);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Your pairing could not be checked.");
        if (!stopped && data.mode !== mode) { router.refresh(); return; }
        if (!stopped) { setPairing(data); setError(""); }
      } catch (cause) { if (!stopped) setError(cause instanceof Error ? cause.message : "Your pairing could not be checked."); }
      finally { inFlight = false; if (!stopped && pendingFocus) { pendingFocus = false; void refresh(true); } else if (!stopped) timer = setTimeout(refresh, delay); }
    }
    void refresh();
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      clearTimeout(timer);
      if (inFlight) pendingFocus = true;
      else void refresh(true);
    };
    const unsubscribe = subscribePlotUpdates(() => {
      clearTimeout(timer);
      if (inFlight) pendingFocus = true;
      else void refresh();
    });
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("pageshow", onVisible);
    return () => { unsubscribe(); stopped = true; clearTimeout(timer); controller.abort(); document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("focus", onVisible); window.removeEventListener("pageshow", onVisible); };
  }, [mode, router]);
  async function checkIn() {
    if (checkingIn) return;
    setCheckingIn(true); setError("");
    try {
      const response = await fetch("/api/plot/checkin", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Check-in failed. Try again.");
      broadcastPlotUpdate();
      setPairing(current => current ? { ...current, checkedIn: true } : current);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Check-in failed."); }
    finally { setCheckingIn(false); }
  }
  return <section className={`plot-pairing${!pairing || !pairing.partners.length ? " plot-checkin-waiting" : ""}`} aria-live="polite">{pairing && pairing.runId !== null && <h2>{pairing.partners.length ? "Your Plot pairing" : "You’re ready for Connections at Plot"}</h2>}
    {!pairing && !error && <div role="status" aria-label="Loading your pairing"><span className="loading-spinner plot-loading-spinner" aria-hidden="true" /></div>}
    {pairing && (mode === "ready" || pairing.runId === null) && !pairing.partners.length && <button type="button" disabled={checkingIn || pairing.checkedIn} onClick={() => void checkIn()}>{checkingIn ? "Checking in…" : pairing.checkedIn ? "You’re checked in" : "I’m here"}</button>}
    {mode === "pairing" && pairing?.runId != null && !pairing.partners.length && <p>You aren’t included in the current round. Your pairing will appear here when you’re included in a new round.</p>}
    {pairing?.partners.map(partner => <div className="plot-pairing-person" key={partner.user_id}><PersonProfileCard id={partner.profile_id} name={partner.name} photo={partner.photo} /><div className="plot-connection-points"><h3>You connect on</h3>{partner.shared.length ? <ul>{intentions.filter(([value]) => partner.shared.includes(value)).map(([value, label]) => <li key={value}>{label}</li>)}</ul> : <p className="small muted">A chance to meet someone new.</p>}</div>{partner.note && <p className="small muted">{partner.note}</p>}
      {partner.answers === null && <p className="small muted">Their prompt answers couldn’t be loaded. We’ll try again automatically.</p>}
      {Boolean(partner.answers?.length) && <section className="plot-partner-answers" aria-label={`${partner.name}’s prompt answers`}><h3>Their prompt answers</h3>{partner.answers!.map(answer => <div className="plot-partner-answer" key={`${answer.prompt.id}:${answer.item.type}:${answer.item.id}`}><SelectionPrompt prompt={answer.prompt} /><Card item={answer.item} />{answer.description && <p className="preview-text"><ResponseText>{answer.description}</ResponseText></p>}</div>)}</section>}
    </div>)}
    {error && <p role="alert" className="error">{error} We’ll check again automatically.</p>}
  </section>;
}
