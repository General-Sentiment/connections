"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
export function AddPrompt() {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!submitted) return;
    const timer = setTimeout(() => setSubmitted(false), 5000);
    return () => clearTimeout(timer);
  }, [submitted]);
  const lock = useRef(false);
  const router = useRouter();
  async function submit() {
    if (!text.trim() || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/prompts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not add prompt.");
      setText(""); setEditing(false); setSubmitted(true); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not add prompt."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div ref={card} className="add-prompt-card">
    {editing ? <div className="prompt-editor-square"><textarea autoFocus aria-label="New prompt" maxLength={2000} disabled={busy} value={text} onChange={event => setText(event.target.value)} onKeyDown={event => {
      if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void submit(); }
      if (event.key === "Escape" && !text) setEditing(false);
    }} /></div> :
      <button type="button" className="add-prompt-square" onClick={() => { setEditing(true); setSubmitted(false); }} aria-label="Add a prompt"><span className="prompt-plus" aria-hidden="true">＋</span><span className="prompt-hover-text">type text here</span></button>}
    <div className="add-prompt-submit-slot">{editing && text.trim() && <button className="add-prompt-submit" type="button" disabled={busy} onClick={() => void submit()}>{busy ? "Adding…" : "Add block"}</button>}</div>
    {submitted && card.current?.closest(".browser-window") && createPortal(<div className="window-toast" role="status">Submitted to Proposed Prompts</div>, card.current.closest(".browser-window")!)}
    {error && <p className="notice error" role="alert">{error}</p>}
  </div>;
}
