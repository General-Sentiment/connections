"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { broadcastPlotUpdate } from "@/lib/plot-broadcast";
export function PlotCheckout() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function checkout() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/plot/checkin", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Check-out failed. Try again.");
      broadcastPlotUpdate();
      router.push("/");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Check-out failed. Try again."); setBusy(false); }
  }
  return <div><button type="button" disabled={busy} onClick={() => void checkout()}>{busy ? "Checking out…" : "Check out"}</button>{error && <p className="small error" role="alert">{error}</p>}</div>;
}
