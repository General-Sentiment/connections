import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { requireSession } from "@/lib/session";
import { assertWrite, apiError, privateJson } from "@/lib/http";
import { plotChannel, readPlotRound, readPlotPartnerPhoto, publishPlotRound, publishPlotInput, plotAttendance, readPlotMode, readActivePlotPrompt, readPlotPrompt } from "@/lib/plot-pairings";
// Collapse focus refreshes from this worker into one invalidation per five seconds.
const focusRuntime = globalThis as typeof globalThis & { plotFocusRefresh?: { until: number; pending?: Promise<void> } };
const focusState = focusRuntime.plotFocusRefresh ??= { until: 0 };
async function refreshFocusedState() {
  if (focusState.pending) return focusState.pending;
  if (Date.now() < focusState.until) return;
  const operation = (async () => {
    revalidateTag("plot-pairings", { expire: 0 });
    await readPlotMode();
    focusState.until = Date.now() + 5000;
  })();
  focusState.pending = operation;
  try { await operation; } finally { focusState.pending = undefined; }
}
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    if (request.nextUrl.searchParams.get("refresh") === "true") await refreshFocusedState();
    const mode = await readPlotMode();
    if (request.nextUrl.searchParams.get("modeOnly") === "true") {
      const activePrompt = await readActivePlotPrompt();
      const prompt = mode === "prompt" ? await readPlotPrompt(activePrompt) : null;
      return privateJson({ mode, activePrompt, promptRevision: prompt?.revision });
    }
    const run = mode === "pairing" ? await readPlotRound(plotChannel()) : null;
    const checkedIn = await plotAttendance(session.person.id);
    if (!run) return privateJson({ mode, runId: null, partners: [], checkedIn });
    const partners = run.pairs.flatMap(pair => pair.first.user_id === session.person.id ? [{ ...pair.second, shared: pair.shared, note: pair.note }] : pair.second.user_id === session.person.id ? [{ ...pair.first, shared: pair.shared, note: pair.note }] : []);
    const withPhotos = await Promise.all(partners.map(async partner => ({ ...partner, photo: partner.photo !== undefined ? partner.photo : await readPlotPartnerPhoto(partner.profile_id).catch(() => null) })));
    return privateJson({ mode, runId: run.id, partners: withPhotos, checkedIn });
  } catch (error) { return apiError(error, { route: "/api/plot/pairings", method: "GET" }); }
}
export async function POST(request: NextRequest) {
  try {
    assertWrite(request);
    const session = await requireSession();
    const result = await publishPlotRound(session.token, session.person.id, publishPlotInput.parse(await request.json()));
    revalidateTag("plot-pairings", { expire: 0 });
    return privateJson(result);
  } catch (error) { return apiError(error, { route: "/api/plot/pairings", method: "POST" }); }
}
