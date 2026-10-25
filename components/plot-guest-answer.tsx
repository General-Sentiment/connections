"use client";
import { useEffect, useRef, useState } from "react";
import { broadcastPlotUpdate } from "@/lib/plot-broadcast";
export function PlotGuestAnswer({ prompt, userId }: { prompt: { id: number; text: string }; userId: number }) {
  const key = `connections:plot-guest-answer:${userId}:${prompt.id}`;
  const [text, setText] = useState(""); const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false); const [error, setError] = useState("");
  const requestId = useRef("");
  useEffect(() => { try { const draft = JSON.parse(localStorage.getItem(key) || "null"); setText(draft?.text || ""); requestId.current = draft?.requestId || crypto.randomUUID(); } catch { requestId.current = crypto.randomUUID(); } setReady(true); }, [key]);
  useEffect(() => { if (ready) try { localStorage.setItem(key, JSON.stringify({ text, requestId: requestId.current })); } catch {} }, [text, ready, key]);
  async function save() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/plot/guest-answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ promptId: prompt.id, text, requestId: requestId.current }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not submit your answer.");
      setSaved(true); broadcastPlotUpdate();
    } catch (cause) { setError(`${cause instanceof Error ? cause.message : "Could not submit."} Your draft is kept on this device. Try saving again.`); }
    finally { setBusy(false); }
  }
  return <section className="plot-guest-answer"><h2>{prompt.text}</h2><form onSubmit={event => { event.preventDefault(); void save(); }}><label className="field">Your answer<textarea rows={8} maxLength={5000} required disabled={busy || !ready} value={text} onChange={event => { setText(event.target.value); setSaved(false); requestId.current = crypto.randomUUID(); }} /></label><button disabled={busy || saved || !text.trim()}>{busy ? "Saving…" : saved ? "Answer saved" : "Save answer"}</button>{error && <p role="alert" className="error">{error}</p>}{saved && <p role="status">Your answer is submitted. You’ll be included when the next round is generated.</p>}</form></section>;
}
