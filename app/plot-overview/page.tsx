import { PlotAnswerSlideshow } from "@/components/plot-answer-slideshow";
import Link from "@/components/app-link";
import { safeUrl } from "@/lib/urls";
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
    const label = mode === "prompt" ? `Prompt ${activePrompt === "two" ? "Two" : "One"}` : mode[0].toUpperCase() + mode.slice(1);
    return <div className="page plot-overview-page"><PlotModeSync mode={mode} activePrompt={activePrompt} promptRevision={prompt?.revision} answersRevision={responses?.revision} activeRunId={mode === "pairing" ? round?.id ?? null : undefined} />{mode === "pairing" ? <section className="plot-overview-pairs" aria-label="Active round pairings">{round?.pairs.length ? <div className="pairing-table-scroll"><table className="pairing-table"><thead><tr><th scope="col">Person 1</th><th scope="col">Person 2</th></tr></thead><tbody>{round.pairs.map((pair, index) => <tr key={index}>{[pair.first, pair.second].map(person => <td key={person.user_id}><Link className="pairing-person" href={`/people/${person.profile_id}`}>{safeUrl(person.photo) ? <img src={safeUrl(person.photo)} alt="" loading="lazy" /> : <span className="pairing-avatar-placeholder" aria-hidden>{person.name.split(/\s+/).slice(0, 2).map(word => word[0]).join("")}</span>}<span>{person.name}</span></Link></td>)}</tr>)}</tbody></table></div> : <p className="empty">No active pairings yet.</p>}</section> : mode === "prompt" && prompt ? <PlotAnswerSlideshow key={activePrompt} prompt={prompt.text} answers={responses?.answers || []} /> : <section className="plot-overview-placeholder" aria-live="polite"><h2>{label}</h2><p className="muted">Placeholder</p></section>}</div>;
  } catch {
    return <div className="page"><p className="notice error" role="alert">The Plot state couldn’t be loaded. Refresh to try again.</p></div>;
  }
}
