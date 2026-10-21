import { PlotOverviewProgress } from "@/components/plot-overview-progress";
import { PlotAnswerSlideshow } from "@/components/plot-answer-slideshow";
import { PlotModeSync } from "@/components/plot-mode-sync";
import { Welcome, hasConnection } from "@/components/welcome";
import { readPlotMode, readActivePlotPrompt, readPlotPrompt, readPlotPromptResponses } from "@/lib/plot-pairings";
import { isDemo } from "@/lib/config";

export const dynamic = "force-dynamic";
export default async function PlotOverview() {
  if (!isDemo() && !await hasConnection()) return <Welcome />;
  try {
    const mode = await readPlotMode();
    const activePrompt = mode === "prompt" || mode === "pairing" ? await readActivePlotPrompt() : undefined;
    const prompt = activePrompt ? await readPlotPrompt(activePrompt).catch(() => undefined) : undefined;
    const responses = activePrompt && prompt ? await readPlotPromptResponses(activePrompt) : undefined;
    const label = mode === "prompt" ? `Prompt ${activePrompt === "two" ? "Two" : "One"}` : mode[0].toUpperCase() + mode.slice(1);
    return <div className="page plot-overview-page"><PlotModeSync mode={mode} activePrompt={activePrompt} promptRevision={prompt?.revision} answersRevision={responses?.revision} /><PlotOverviewProgress>{activePrompt && prompt ? <PlotAnswerSlideshow key={`${mode}:${activePrompt}`} prompt={prompt.text} answers={responses?.answers || []} autoAdvance={mode === "pairing"} /> : mode === "ready" ? <section className="plot-overview-placeholder plot-ready-instructions" aria-label="Getting started"><ol><li>Get a nametag and fill it in with your name and preferences.</li><li>On your phone go to <a href="https://www.connections.forum/plot">www.connections.forum/plot</a>.</li><li>Sign up and answer the current prompt to be included in pairing.</li></ol></section> : <section className="plot-overview-placeholder" aria-live="polite"><h2>{label}</h2><p className="muted">{mode === "pairing" ? "Getting ready for pairing…" : "Placeholder"}</p></section>}</PlotOverviewProgress></div>;
  } catch {
    return <div className="page"><p className="notice error" role="alert">The Plot state couldn’t be loaded. Refresh to try again.</p></div>;
  }
}
