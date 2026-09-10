"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function SetupForm({ label = "Create directory channel →" }: { label?: string }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const router = useRouter();
  return <div><button disabled={busy} onClick={async () => { setBusy(true); setError(""); try { const r = await fetch("/api/setup", { method: "POST" }); const data = await r.json(); if (!r.ok) throw new Error(data.error); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Could not configure the directory."); } finally { setBusy(false); } }}>{busy ? "Saving…" : label}</button>{error && <p className="error" role="alert">{error}</p>}</div>;
}
