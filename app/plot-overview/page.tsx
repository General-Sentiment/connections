import { PlotOverviewPairs } from "@/components/plot-overview-pairs";
import { PlotOverviewProgress } from "@/components/plot-overview-progress";
import { PlotAnswerSlideshow } from "@/components/plot-answer-slideshow";
import { PlotModeSync } from "@/components/plot-mode-sync";
import { Welcome, hasConnection } from "@/components/welcome";
import { readPlotMode, readActivePlotPrompt, readPlotPrompt, readPlotPromptResponses, readPlotRound, plotChannel } from "@/lib/plot-pairings";
import { isDemo } from "@/lib/config";

export const dynamic = "force-dynamic";
export default async function PlotOverview() {
  if (!isDemo() && !await hasConnection()) return <Welcome />;
  try {
    const mode = await readPlotMode();
    const activePrompt = mode === "prompt" ? await readActivePlotPrompt() : undefined;
    const prompt = activePrompt ? await readPlotPrompt(activePrompt).catch(() => undefined) : undefined;
    const responses = activePrompt && prompt ? await readPlotPromptResponses(activePrompt) : undefined;
    const round = mode === "pairing" ? await readPlotRound(plotChannel()) : null;
    const label = mode === "prompt" ? `Prompt ${activePrompt === "three" ? "Three" : activePrompt === "two" ? "Two" : "One"}` : mode[0].toUpperCase() + mode.slice(1);
    return <div className="page plot-overview-page"><PlotModeSync mode={mode} activePrompt={activePrompt} promptRevision={prompt?.revision} answersRevision={responses?.revision} activeRunId={mode === "pairing" ? round?.id ?? null : undefined} /><PlotOverviewProgress>{mode === "pairing" ? <section className="plot-overview-pairs" aria-label="Active pairings">{round?.pairs.length ? <PlotOverviewPairs pairs={round.pairs} /> : <div className="plot-overview-placeholder"><p>Getting ready for pairing…</p></div>}</section> : activePrompt && prompt ? <PlotAnswerSlideshow key={`${mode}:${activePrompt}`} prompt={prompt.text} answers={responses?.answers || []} /> : mode === "ready" || mode === "inactive" ? <section className="plot-overview-placeholder plot-ready-instructions" aria-label="Getting started"><ol><li>Get a nametag from next to the door and fill it out</li><li>Sign up or login to <a href="https://www.are.na" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>www.are.na</a></li><li>Go to <a href="https://www.connections.forum" style={{ textDecoration: "underline" }}>www.connections.forum</a> and connect to your Are.na</li><li>Create your Connections profile, or join Plot with just your name</li></ol><a className="plot-ready-qr" href="https://connections.forum" aria-label="Open connections.forum"><img src="/connections-qr.svg" alt="QR code linking to connections.forum" width={370} height={370} /></a></section> : <section className="plot-overview-placeholder" aria-live="polite"><h2>{label}</h2><p className="muted">Placeholder</p></section>}</PlotOverviewProgress></div>;
  } catch {
    return <div className="page"><p className="notice error" role="alert">The Plot state couldn’t be loaded. Refresh to try again.</p></div>;
  }
}
