"use client";
import { normalizeParticipantName, normalizeParticipantCode } from "@/lib/plot-participant-input";
import { useEffect, useState } from "react";
const storageKey = "connections:plot-guest";
export function PlotGuestEntry({ initialName = "" }: { initialName?: string }) {
  const [name, setName] = useState(initialName);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem(storageKey) || "null"); if (saved?.name) setName(saved.name); else if (localStorage.getItem("connections:plot-pending-name")) setName(localStorage.getItem("connections:plot-pending-name")!); } catch {} }, []);
  async function join() {
    if (busy || !name.trim()) return;
    setBusy(true); setError("");
    try {
      let saved;
      try { saved = JSON.parse(localStorage.getItem(storageKey) || "null"); } catch {}
      const normalizedCode = normalizeParticipantCode(code);
      const [codeId, codeSecret, extra] = normalizedCode.split(".");
      if (normalizedCode && (!codeId || !codeSecret || extra !== undefined)) throw new Error("Enter the complete participant code, including the dot.");
      const identity = { id: codeId || saved?.id || crypto.randomUUID(), secret: codeSecret || saved?.secret || crypto.randomUUID() + crypto.randomUUID(), name: normalizeParticipantName(name) };
      localStorage.setItem(storageKey, JSON.stringify(identity));
      const response = await fetch("/api/plot/guest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(identity) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not join yet. Try again.");
      localStorage.setItem(storageKey, JSON.stringify({ ...identity, name: data.name }));
      window.location.replace("/plot");
    } catch (cause) { setError(`${cause instanceof Error ? cause.message : "Could not join yet."} Your name is kept on this device where storage is available. Try again.`); setBusy(false); }
  }
  return <section className="plot-guest-entry"><h2>Join Plot without an account</h2><div><label className="field">Your name<input autoComplete="name" maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label><details><summary>Have a participant code?</summary><label className="field">Participant code<input value={code} onChange={event => setCode(event.target.value)} /></label></details><p className="small muted">Your name and answers appear on the Plot board. This device remembers your guest identity.</p><button type="button" onClick={() => void join()} disabled={busy || !name.trim()}>{busy ? "Joining…" : "Continue without an account"}</button>{error && <p role="alert" className="error">{error}</p>}</div><p><a href="/api/auth/login?next=/plot">Connect with Are.na</a></p></section>;
}
