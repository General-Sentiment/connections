"use client";
import { subscribePlotUpdates } from "@/lib/plot-broadcast";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PlotMode } from "@/lib/plot-pairings";
export function PlotModeSync({ mode, activePrompt, promptRevision, activeRunId, answersRevision }: { mode: PlotMode; activePrompt?: "one" | "two"; promptRevision?: string; activeRunId?: number | null; answersRevision?: string }) {
  const router = useRouter();
  useEffect(() => {
    let stopped = false; let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    let inFlight = false;
    let pendingFocus = false;
    async function poll(fresh = false) {
      if (stopped || inFlight) return;
      let delay = 15000;
      if (document.visibilityState === "hidden") { timer = setTimeout(poll, delay); return; }
      inFlight = true;
      try {
        const response = await fetch(`/api/plot/pairings?modeOnly=true${fresh ? "&refresh=true" : ""}`, { cache: "no-store", signal: controller.signal });
        if (response.status === 429) delay = Math.max(delay, (Number(response.headers.get("Retry-After")) || 60) * 1000);
        if (response.ok) { const data = await response.json(); if (!stopped && (data.mode !== mode || (answersRevision !== undefined && data.answersRevision !== answersRevision) || (activeRunId !== undefined && data.activeRunId !== activeRunId) || (mode === "prompt" && (data.activePrompt !== activePrompt || data.promptRevision !== promptRevision)))) { router.refresh(); } }
      } catch { /* Retry without disrupting onboarding. */ }
      finally { inFlight = false; }
      if (!stopped && pendingFocus) { pendingFocus = false; void poll(true); }
      else if (!stopped) timer = setTimeout(poll, delay);
    }
    timer = setTimeout(poll, 15000);
    const recheck = () => {
      if (document.visibilityState !== "visible") return;
      clearTimeout(timer);
      if (inFlight) pendingFocus = true;
      else void poll(true);
    };
    const unsubscribe = subscribePlotUpdates(() => {
      clearTimeout(timer);
      if (inFlight) pendingFocus = true;
      else void poll();
    });
    window.addEventListener("focus", recheck);
    window.addEventListener("pageshow", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => { unsubscribe(); stopped = true; clearTimeout(timer); controller.abort(); window.removeEventListener("focus", recheck); window.removeEventListener("pageshow", recheck); document.removeEventListener("visibilitychange", recheck); };
  }, [mode, activePrompt, promptRevision, activeRunId, answersRevision, router]);
  return null;
}
