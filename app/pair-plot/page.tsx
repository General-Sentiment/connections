import { PlotRuns } from "@/components/plot-runs";
import { plotPublisher } from "@/lib/plot-pairings";
import { Header } from "@/components/header";
import { MatchPicker } from "@/components/match-picker";
import { Welcome, hasConnection } from "@/components/welcome";
import { getSession } from "@/lib/session";
import { demoPeople } from "@/lib/demo";
import { isDemo } from "@/lib/config";

export const dynamic = "force-dynamic";
export default async function PairPlotPage() {
  const demo = isDemo();
  if (!demo && !await hasConnection()) return <Welcome />;
  const session = await getSession();
  let canPublish = demo;
  if (session?.token && !demo) {
    try { await plotPublisher(session.token); canPublish = true; } catch { /* Publishing requires event-channel edit access. */ }
  }
  return <div className="page"><Header title="Pair Plot" hideArena />{canPublish ? <>{!demo && <PlotRuns />}<MatchPicker publishPlot={!demo} selfId={session?.person?.id ?? (demo ? demoPeople[0].id : undefined)} everyone /></> : <p className="notice">Only editors of the Plot event channel can generate and publish rounds.</p>}{demo && <p className="preview-note">Preview · Sample profiles.</p>}</div>;
}
