"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function ImportConversation() {
  const [open, setOpen] = useState(false); const [url, setUrl] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const router = useRouter();
  return <div className="import-conversation" aria-busy={busy}>{!open ? <button className="quiet" onClick={() => setOpen(true)}>Open an existing channel →</button> : <form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(""); try { const response = await fetch("/api/conversations/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); router.push(`/connections/${data.channelId}`); } catch (e) { setError(e instanceof Error ? e.message : "Could not open the channel."); } finally { setBusy(false); } }}><label className="field">Private Are.na channel<input required type="url" value={url} onChange={e => setUrl(e.target.value)} /></label><button disabled={busy}>{busy ? "Opening…" : "Open →"}</button>{error && <p role="alert" className="error small">{error}</p>}</form>}</div>;
}
