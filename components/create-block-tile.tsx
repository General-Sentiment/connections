"use client";
import { useEffect, useRef, useState } from "react";
import type { Item } from "@/lib/types";
export function CreateBlockTile({ onCreated, plotPromptId, sandbox = false, droppedFile, onUploading }: { onUploading?: (busy: boolean) => void; droppedFile?: File; onCreated: (item: Item) => void; plotPromptId?: number; sandbox?: boolean }) {
  const [value, setValue] = useState("");
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const requestId = useRef<string | undefined>(undefined);
  const autoUpload = useRef(false);
  const uploaded = useRef<{ key: string; proof: string } | undefined>(undefined);
  useEffect(() => { if (!file) { setPreview(undefined); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  function choose(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 10 * 1024 * 1024) { setError("Choose a JPG, PNG, WebP, or GIF image under 10 MB."); return; }
    setFile(file); setValue(""); uploaded.current = undefined; requestId.current = undefined; setError("");
  }
  useEffect(() => { if (droppedFile) { autoUpload.current = true; choose(droppedFile); } }, [droppedFile]);
  useEffect(() => { if (file && (!droppedFile || file === droppedFile) && autoUpload.current && !busy) { autoUpload.current = false; void add(); } }, [file, busy, droppedFile]);
  async function add() {
    if (busy || (!file && !value.trim())) return;
    setBusy(true); onUploading?.(true); setError(""); requestId.current ??= crypto.randomUUID();
    try {
      if (sandbox) throw new Error("Uploads are disabled in the local onboarding preview.");
      if (file && !uploaded.current) {
        const presign = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }) });
        const data = await presign.json(); if (!presign.ok) throw new Error(data.error);
        const response = await fetch(data.upload_url, { method: "PUT", headers: { "Content-Type": data.content_type }, body: file });
        if (!response.ok) throw new Error("The image could not be uploaded. Try again.");
        uploaded.current = { key: data.key, proof: data.proof };
      }
      const response = await fetch("/api/profile/blocks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: requestId.current, ...(uploaded.current ? { uploadKey: uploaded.current.key, uploadProof: uploaded.current.proof, title: file?.name || "" } : { value }), ...(plotPromptId ? { plotPromptId } : {}) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "The block could not be added.");
      onCreated(data.item);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The block could not be added."); }
    finally { setBusy(false); onUploading?.(false); }
  }
  const populated = Boolean(value || file);
  return <div className="create-block"><div aria-busy={busy} className={`create-block-square${focused ? " is-focused" : ""}${populated ? " has-content" : ""}`} onDragOver={event => { event.preventDefault(); }} onDrop={event => { event.preventDefault(); if (!busy) { autoUpload.current = true; choose(event.dataTransfer.files[0]); } }}>
    <input type="file" ref={input} accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={event => choose(event.target.files?.[0])} />
    {preview ? <><img className="create-block-preview" src={preview} alt={file?.name || "Image to upload"} /></> : <textarea ref={textarea} aria-label="New block text or URL" disabled={busy} value={value} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onChange={event => { setValue(event.target.value); requestId.current = undefined; }} onPaste={event => { const image = Array.from(event.clipboardData.files).find(file => file.type.startsWith("image/")); if (image) { event.preventDefault(); choose(image); } }} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (value.trim()) void add(); } }} maxLength={50000} />}
    {!populated && !focused && <><span className="create-block-plus" aria-hidden="true">＋</span><div className="create-block-hint"><p>Drop or <button type="button" className="quiet" disabled={busy} onClick={() => input.current?.click()}>choose files</button>, paste a URL (image, video, or link) or type text here</p></div></>}
    {busy && <div className="create-block-uploading" role="status"><span className="loading-spinner" aria-hidden="true" /><span>{file ? "Uploading image…" : "Adding block…"}</span></div>}
    {!file && <span className="create-block-shortcut" aria-hidden="true">{focused ? "SHIFT + ENTER FOR LINE BREAK" : "⌘ ENTER"}</span>}
  </div>{populated && <button type="button" className="create-block-submit" disabled={busy} onClick={() => void add()}>{busy ? "Adding block…" : "Add block"}</button>}{error && <p role="alert" className="small error">{error}</p>}</div>;
}
