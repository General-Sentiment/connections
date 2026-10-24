"use client";
import { broadcastPlotUpdate, subscribePlotUpdates } from "@/lib/plot-broadcast";
import Link from "./app-link";
import { intentions } from "@/lib/details";
import { safeUrl } from "@/lib/urls";
import { StateSelect } from "./state-select";
import { useEffect, useRef, useState } from "react";
type Runs = { activeSettings?: { romantic: boolean; romanticPreferences: boolean; location?: string }; activePairs: { first: { user_id: number; profile_id: number; name: string; photo?: string | null; chair?: number }; second: { user_id: number; profile_id: number; name: string; photo?: string | null; chair?: number }; shared: string[]; note?: string }[]; activePrompt: "one" | "two" | "three"; mode: "inactive" | "ready" | "pairing" | "prompt"; attendees: { userId: number; profileId: number; name: string }[]; checkedInCount: number; activeRunId: number | null; runs: { id: number; title: string | null; createdAt: string; pairCount: number }[] };
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
        if (!controller.signal.aborted) { setData({ ...result, activePairs: result.activePairs ?? [] }); setError(""); }
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Saved rounds could not be loaded."); }
    }
    void load();
    const refresh = () => { void load(); };
    const unsubscribe = subscribePlotUpdates(refresh);
    window.addEventListener("plot-round-published", refresh);
    window.addEventListener("focus", refresh);
    return () => { unsubscribe(); controller.abort(); window.removeEventListener("plot-round-published", refresh); window.removeEventListener("focus", refresh); };
  }, []);
  async function changeMode(mode: Runs["mode"]) {
    if (busy.current) return;
    busy.current = true; setSaving(-2); setError("");
    try {
      const response = await fetch("/api/plot/runs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "State could not be saved.");
      broadcastPlotUpdate();
      setData(current => current ? { ...current, mode: result.mode } : current);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "State could not be saved."); }
    finally { busy.current = false; setSaving(undefined); }
  }
  async function changePrompt(activePrompt: "one" | "two" | "three") {
    if (busy.current) return;
    busy.current = true; setSaving(-3); setError("");
    try {
      const response = await fetch("/api/plot/runs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activePrompt }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Prompt could not be selected.");
      broadcastPlotUpdate();
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
      broadcastPlotUpdate();
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
      broadcastPlotUpdate();
      setData(current => current ? { ...current, mode: result.mode ?? current.mode, activeRunId: result.activeRunId, runs: current.runs.filter(run => !result.deletedRunIds.includes(run.id)) } : current);
      window.dispatchEvent(new Event("plot-round-selected"));
    } catch (cause) { window.dispatchEvent(new Event("plot-round-published")); setError(cause instanceof Error ? cause.message : "This round could not be deleted."); }
    finally { busy.current = false; setSaving(undefined); }
  }
  return <section className="plot-runs" aria-label="Saved pairing rounds">{data && <StateSelect value={data.mode} disabled={saving !== undefined} onChange={mode => void changeMode(mode)} />}{data && <StateSelect label="Active prompt" value={data.activePrompt} disabled={saving !== undefined} options={[{ value: "one", label: "Prompt One" }, { value: "two", label: "Prompt Two" }, { value: "three", label: "Prompt Three" }]} onChange={value => void changePrompt(value)} />}<h2 className="section-heading">Pairing rounds{Boolean(data?.runs.length) && <button type="button" className="quiet" disabled={saving !== undefined} onClick={() => void remove()}>Delete all rounds</button>}</h2>
    {!data && !error && <p role="status" className="small muted">Loading saved rounds…</p>}
    {error && <p role="alert" className="notice error">{error}</p>}
    {data && !data.runs.length && <p className="small muted">No saved rounds yet. Pair to create and activate the first round.</p>}
    <div className="plot-run-grid">{data?.runs.map((run, index) => <article className="plot-run-card" key={run.id}>
      <button type="button" className="plot-run-block" aria-pressed={data.activeRunId === run.id} disabled={saving !== undefined} onClick={() => void select(run.id)}><span>Round {data.runs.length - index}</span><span className="small muted">{new Date(run.createdAt).toLocaleString()}</span><span className="small muted">{run.pairCount} {run.pairCount === 1 ? "pair" : "pairs"} · #{run.id}</span><span>{saving === run.id ? "Saving…" : data.activeRunId === run.id ? "Active" : "Select round"}</span></button>
      <div className="plot-run-actions"><a href={`https://www.are.na/block/${run.id}`} target="_blank" rel="noopener noreferrer">Open on Are.na ↗</a><button type="button" className="quiet" disabled={saving !== undefined} onClick={() => void remove(run.id)}>Delete round</button></div>
    </article>)}</div>
    {Boolean(data?.activePairs?.length) && <section aria-label="Active round pairings"><h3>Active round pairings</h3><div className="pairing-table-scroll"><table className="pairing-table"><thead><tr><th>Person 1</th><th>Person 2</th><th>Paired based on</th></tr></thead><tbody>{(data?.activePairs ?? []).map((pair, index) => <tr key={index}>{[pair.first, pair.second].map((person, column) => <td key={column}><Link className="pairing-person" href={`/people/${person.profile_id}`}>{safeUrl(person.photo) ? <img src={safeUrl(person.photo)} alt="" loading="lazy" /> : <span className="pairing-avatar-placeholder" aria-hidden>{person.name.split(/\s+/).slice(0, 2).map(word => word[0]).join("")}</span>}<span>{person.name}<span className="small muted"> · {person.chair ? `Chair ${person.chair}` : "No chair"}</span></span></Link></td>)}<td>{pair.shared?.length ? intentions.filter(([value]) => pair.shared.includes(value)).map(([, label]) => label).join(", ") : "Random — no shared preferences"}{!pair.note && data?.activeSettings?.romantic && <div className="small muted">{data.activeSettings.romanticPreferences ? "Mutual romantic preferences" : "Open to romance"}</div>}{!pair.note && data?.activeSettings?.location && <div className="small muted">Same {data.activeSettings.location === "state" ? "state / region" : data.activeSettings.location}</div>}{pair.note && <div className="small muted">{pair.note}</div>}</td></tr>)}</tbody></table></div></section>}
    {data && data.runs.length > 0 && <p className="small muted">Selecting a round changes the pairing shown on attendees’ Plot pages.</p>}
  </section>;
}
