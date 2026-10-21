"use client";
import { useEffect, useState, type ReactNode } from "react";
import { subscribePlotProgress, type PlotProgress } from "@/lib/plot-progress";
export function PlotOverviewProgress({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<PlotProgress>(null);
  useEffect(() => subscribePlotProgress(setProgress), []);
  const counts = progress?.message.match(/(\d+) of (\d+) profiles/);
  if (!progress) return children;
  return <section className="plot-overview-placeholder" role="status" aria-live="polite"><span className="loading-spinner plot-loading-spinner" aria-hidden="true" /><h2>Getting ready for pairing…</h2><p className="muted">{progress.message}</p>{counts ? <progress aria-label="Profiles checked" value={Number(counts[1])} max={Number(counts[2])} /> : <progress aria-label="Loading profiles" />}</section>;
}
