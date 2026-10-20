"use client";
import { useEffect, useState } from "react";
import { SelectionPrompt } from "./selection-prompt";
import { ItemPicker } from "./item-picker";
import { CardFace } from "./card";
import type { Item } from "@/lib/types";
import type { ProfilePrompt } from "@/lib/prompts";
export function PlotPromptAnswer({ prompt, userId }: { prompt: ProfilePrompt; userId: number }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [item, setItem] = useState<Item>();
  const [description, setDescription] = useState("");
  const [picker, setPicker] = useState(false);
  const [restored, setRestored] = useState(false);
  const storageKey = `plot-prompt-answer:${userId}:${prompt.id}`;
  useEffect(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem(storageKey) || "null");
      if (draft?.item?.id && draft.item.type) setItem(draft.item);
      if (typeof draft?.description === "string") setDescription(draft.description);
    } catch { /* Storage may be unavailable. */ }
    setRestored(true);
  }, [storageKey]);
  useEffect(() => {
    if (!restored) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify({ item, description })); } catch { /* Keep the editable answer in memory. */ }
  }, [item, description, restored, storageKey]);
  async function save() {
    if (!item || saving) return;
    setSaving(true); setSaved(false); setError("");
    try {
      const response = await fetch("/api/plot/answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ promptId: prompt.id, answer: { id: item.id, type: item.type === "Channel" ? "Channel" : "Block" }, description }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Your answer could not be saved.");
      setSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Your answer could not be saved."); }
    finally { setSaving(false); }
  }
  return <section className="profile-editor plot-prompt-answer" aria-label="Answer the Plot prompt">
    <div className="selected-slot"><SelectionPrompt prompt={prompt} />
      {item ? <><div className="selected-block"><CardFace item={item} /></div><div className="selected-controls"><span>{item.type !== "Channel" ? item.title : ""}</span><div><button type="button" className="quiet" disabled={saving} onClick={() => setPicker(true)}>Replace</button></div></div></> : <div className="empty-answer-tile"><button type="button" disabled={saving} onClick={() => setPicker(true)} aria-label="Choose a block or channel to answer the prompt">Choose one of your blocks or channels</button></div>}
      <div className="field selected-description-field"><textarea aria-label="Say more about your answer" placeholder="Say more?" rows={5} maxLength={5000} disabled={saving} value={description} onChange={event => { setDescription(event.target.value); setSaved(false); }} /></div>
      <button type="button" className="profile-primary" disabled={!item || saving || saved} onClick={() => void save()}>{saving ? "Saving…" : saved ? "Answer saved" : "Save answer"}</button>{error && <p role="alert" className="error">{error}</p>}{saved && <p role="status" className="small muted">Saved to Are.na and your profile.</p>}
    </div>
    {picker && <ItemPicker plotPromptId={prompt.id} selected={[]} onChange={items => setItem(items[0])} onReplace={selected => { setItem(selected); setSaved(false); setPicker(false); }} prompt={prompt} onClose={() => setPicker(false)} />}
  </section>;
}
