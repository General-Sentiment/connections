"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { broadcastPlotUpdate } from "@/lib/plot-broadcast";
export function PlotCheckin() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function checkIn() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/plot/checkin", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Check-in failed. Try again.");
      broadcastPlotUpdate();
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Check-in failed. Try again."); setBusy(false); }
  }
  return <section className="plot-checkin-waiting" aria-live="polite"><button type="button" disabled={busy} onClick={() => void checkIn()}>{busy ? "Checking in…" : "I’m here"}</button>{error && <p className="error" role="alert">{error}</p>}</section>;
}
