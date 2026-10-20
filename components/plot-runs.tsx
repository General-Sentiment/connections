"use client";
import { StateSelect } from "./state-select";
import { useEffect, useRef, useState } from "react";
type Runs = { activePrompt: "one" | "two"; mode: "inactive" | "ready" | "pairing" | "prompt"; attendees: { userId: number; profileId: number; name: string }[]; checkedInCount: number; activeRunId: number | null; runs: { id: number; title: string | null; createdAt: string; pairCount: number }[] };
export function PlotRuns() {
  const [data, setData] = useState<Runs>();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<number>();
  const busy = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/plot/runs", { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Saved rounds could not be loaded.");
        if (!controller.signal.aborted) { setData(result); setError(""); }
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Saved rounds could not be loaded."); }
    }
    void load();
    const refresh = () => { void load(); };
    window.addEventListener("plot-round-published", refresh);
    window.addEventListener("focus", refresh);
    return () => { controller.abort(); window.removeEventListener("plot-round-published", refresh); window.removeEventListener("focus", refresh); };
  }, []);
  async function changeMode(mode: Runs["mode"]) {
    if (busy.current) return;
    busy.current = true; setSaving(-2); setError("");
    try {
      const response = await fetch("/api/plot/runs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "State could not be saved.");
      setData(current => current ? { ...current, mode: result.mode } : current);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "State could not be saved."); }
    finally { busy.current = false; setSaving(undefined); }
  }
  async function changePrompt(activePrompt: "one" | "two") {
    if (busy.current) return;
    busy.current = true; setSaving(-3); setError("");
    try {
      const response = await fetch("/api/plot/runs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activePrompt }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Prompt could not be selected.");
      setData(current => current ? { ...current, activePrompt: result.activePrompt } : current);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Prompt could not be selected."); }
    finally { busy.current = false; setSaving(undefined); }
  }
  async function select(runId: number) {
    if (busy.current || runId === data?.activeRunId) return;
    busy.current = true; setSaving(runId); setError("");
    try {
      const response = await fetch("/api/plot/runs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ runId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "This round could not be selected.");
      setData(current => current ? { ...current, activeRunId: result.activeRunId } : current);
      window.dispatchEvent(new Event("plot-round-selected"));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "This round could not be selected."); }
    finally { busy.current = false; setSaving(undefined); }
  }
  async function remove(runId?: number) {
    if (busy.current || !window.confirm(runId === undefined ? "Remove all rounds from Plot and clear the active pairing? Are.na blocks will be kept." : "Remove this round from Plot? If active, attendees will return to the waiting screen. Its Are.na block will be kept.")) return;
    busy.current = true; setSaving(runId ?? -1); setError("");
    try {
      const response = await fetch("/api/plot/runs", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(runId === undefined ? { all: true } : { runId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "This round could not be deleted.");
      setData(current => current ? { ...current, mode: result.mode ?? current.mode, activeRunId: result.activeRunId, runs: current.runs.filter(run => !result.deletedRunIds.includes(run.id)) } : current);
      window.dispatchEvent(new Event("plot-round-selected"));
    } catch (cause) { window.dispatchEvent(new Event("plot-round-published")); setError(cause instanceof Error ? cause.message : "This round could not be deleted."); }
    finally { busy.current = false; setSaving(undefined); }
  }
  return <section className="plot-runs" aria-label="Saved pairing rounds">{data && <StateSelect value={data.mode} disabled={saving !== undefined} onChange={mode => void changeMode(mode)} />}{data && <StateSelect label="Active prompt" value={data.activePrompt} disabled={saving !== undefined} options={[{ value: "one", label: "Prompt One" }, { value: "two", label: "Prompt Two" }]} onChange={value => void changePrompt(value)} />}<h2 className="section-heading">Pairing rounds{Boolean(data?.runs.length) && <button type="button" className="quiet" disabled={saving !== undefined} onClick={() => void remove()}>Delete all rounds</button>}</h2>
    {!data && !error && <p role="status" className="small muted">Loading saved rounds…</p>}
    {error && <p role="alert" className="notice error">{error}</p>}
    {data && !data.runs.length && <p className="small muted">No saved rounds yet. Pair to create and activate the first round.</p>}
    {data && <details className="plot-attendees"><summary>{data.checkedInCount} {data.checkedInCount === 1 ? "person checked in" : "people checked in"}</summary>{data.attendees.length ? <p className="plot-attendee-names">{data.attendees.map((person, index) => <span key={person.userId}>{index > 0 && ", "}<a href={`/people/${person.profileId}`}>{person.name}</a></span>)}</p> : <p className="small muted">No one has checked in yet.</p>}</details>}
    <div className="plot-run-grid">{data?.runs.map((run, index) => <article className="plot-run-card" key={run.id}>
      <button type="button" className="plot-run-block" aria-pressed={data.activeRunId === run.id} disabled={saving !== undefined} onClick={() => void select(run.id)}><span>Round {data.runs.length - index}</span><span className="small muted">{new Date(run.createdAt).toLocaleString()}</span><span className="small muted">{run.pairCount} {run.pairCount === 1 ? "pair" : "pairs"} · #{run.id}</span><span>{saving === run.id ? "Saving…" : data.activeRunId === run.id ? "Active" : "Select round"}</span></button>
      <div className="plot-run-actions"><a href={`https://www.are.na/block/${run.id}`} target="_blank" rel="noopener noreferrer">Open on Are.na ↗</a><button type="button" className="quiet" disabled={saving !== undefined} onClick={() => void remove(run.id)}>Delete round</button></div>
    </article>)}</div>
    {data && data.runs.length > 0 && <p className="small muted">Selecting a round changes the pairing shown on attendees’ Plot pages.</p>}
  </section>;
}
