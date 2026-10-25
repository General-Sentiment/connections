import { PlotGuestEntry } from "@/components/plot-guest-entry";
import { PlotGuestAnswer } from "@/components/plot-guest-answer";
import { PlotPromptAnswer } from "@/components/plot-prompt-answer";
import { readPlotMode, readActivePlotPrompt, readPlotPrompt } from "@/lib/plot-pairings";
import { PlotModeSync } from "@/components/plot-mode-sync";
import { PlotPairing } from "@/components/plot-pairing";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { ProfileForm } from "@/components/profile-form";
import { getSession } from "@/lib/session";
import { ArenaClient } from "@/lib/arena";
import { availableProfileRef } from "@/lib/profiles";
import { logServerError } from "@/lib/logging";

export const dynamic = "force-dynamic";

export default async function Plot() {
  const mode = await readPlotMode();
  if (mode === "inactive") redirect("/onboarding");
  const session = await getSession();
  if (!session?.plotGuest && (!session?.person || !session.token)) return <div className="page plot-page"><Header title="Plot" parent="Connections" hideArena /><PlotModeSync mode={mode} /><PlotGuestEntry /></div>;
  if (session?.plotGuest) {
    const guest = session.plotGuest;
    if (mode === "prompt") {
      const activePrompt = await readActivePlotPrompt();
      const prompt = await readPlotPrompt(activePrompt);
      return <div className="page plot-page"><Header title="Plot" parent="Connections" hideArena /><PlotModeSync mode={mode} activePrompt={activePrompt} promptRevision={prompt.revision} /><div className="plot-prompt-container"><PlotGuestAnswer key={prompt.id} userId={guest.userId} prompt={prompt} /></div></div>;
    }
    return <div className="page plot-page"><Header title="Plot" parent="Connections" hideArena /><PlotPairing key={mode} mode={mode === "pairing" ? "pairing" : "ready"} /></div>;
  }
  if (!session?.person || !session.token) redirect("/api/auth/login?next=/plot");
  let complete = false;
  let error = "";
  if (session?.person && session.token) {
    try {
      const ref = await availableProfileRef(session.person.id, new ArenaClient(session.token));
      complete = Boolean(ref?.published);
    } catch (cause) {
      logServerError(cause, { event: "page.load_failed", route: "/plot", method: "GET" });
      error = "We couldn’t check your profile. Please refresh to try again.";
    }
  }
  if (!error && !complete) return <div className="page plot-page"><Header title="Plot" parent="Connections" hideArena /><PlotModeSync mode={mode} /><ProfileForm person={session.person} demo={false} plot /><PlotGuestEntry initialName={session.person.name} /></div>;
  if (!error && mode === "prompt") {
    const activePrompt = await readActivePlotPrompt();
    let prompt; let promptError = "";
    try { prompt = await readPlotPrompt(activePrompt); } catch (cause) { promptError = cause instanceof Error ? cause.message : "The prompt could not be loaded."; }
    return <div className="page plot-page"><Header title="Plot" parent="Connections" hideArena /><PlotModeSync mode={mode} activePrompt={activePrompt} promptRevision={prompt?.revision} /><div className="plot-prompt-container">{prompt ? <PlotPromptAnswer key={`${session.person.id}:${prompt.id}`} userId={session.person.id} prompt={{ id: prompt.id, text: prompt.text }} /> : <p role="alert">{promptError}</p>}</div></div>;
  }
  return <div className="page plot-page">
    <Header title="Plot" parent="Connections" hideArena />
    {error ? <p className="notice error" role="alert">{error}</p> : <PlotPairing key={mode} mode={mode === "pairing" ? "pairing" : "ready"} />}
  </div>;
}
