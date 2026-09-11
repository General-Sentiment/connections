"use client";
import { useEffect, useRef, useState } from "react";
import type { ProfilePrompt } from "@/lib/prompts";
export function PromptPicker({ prompts, onSelect, onClose }: { prompts: ProfilePrompt[]; onSelect: (prompt: ProfilePrompt) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  useEffect(() => { const modal = dialog.current; modal?.showModal(); return () => modal?.close(); }, []);
  const matches = prompts.filter(prompt => `${prompt.text} ${prompt.author?.name || ""}`.toLowerCase().includes(query.toLowerCase()));
  return <dialog ref={dialog} className="picker-dialog prompt-picker-dialog" aria-label="Choose a prompt" onCancel={onClose} onClick={event => { if (event.target === dialog.current) onClose(); }}>
    <div className="picker-body">
      <div className="dialog-heading"><h2>Choose a prompt</h2><button type="button" className="icon" aria-label="Close prompt picker" onClick={onClose}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></div>
      <input autoFocus className="search-input" aria-label="Search prompts" placeholder="Search prompts" value={query} onChange={event => setQuery(event.target.value)} />
      <div className="prompt-picker-list">{matches.map(prompt => <button type="button" key={prompt.id} onClick={() => onSelect(prompt)}><span>{prompt.text}</span>{prompt.author && <span className="prompt-author">by {prompt.author.name}</span>}</button>)}{!matches.length && <p className="empty">No matching prompts.</p>}</div>
    </div>
  </dialog>;
}
