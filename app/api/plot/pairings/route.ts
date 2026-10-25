import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { getSession, requireSession } from "@/lib/session";
import { assertWrite, apiError, privateJson } from "@/lib/http";
import { plotChannel, readPlotRound, readPlotPartnerPhoto, readPlotPartnerAnswers, publishPlotRound, publishPlotInput, readPlotMode, readActivePlotPrompt, readPlotPrompt, readPlotPromptResponses, readGuestPlotAnswers } from "@/lib/plot-pairings";
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
    const identity = await getSession();
    const session = identity?.plotGuest ? { person: { id: identity.plotGuest.userId } } : await requireSession();
    if (request.nextUrl.searchParams.get("refresh") === "true") await refreshFocusedState();
    const mode = await readPlotMode();
    if (request.nextUrl.searchParams.get("modeOnly") === "true") {
      const activePrompt = await readActivePlotPrompt();
      const prompt = mode === "prompt" || mode === "pairing" ? await readPlotPrompt(activePrompt) : null;
      const responses = mode === "prompt" || mode === "pairing" ? await readPlotPromptResponses(activePrompt) : null;
      const round = mode === "pairing" ? await readPlotRound(plotChannel()) : null;
      return privateJson({ mode, activePrompt, promptRevision: prompt?.revision, answersRevision: responses?.revision, activeRunId: round?.id ?? null });
    }
    const run = mode === "pairing" ? await readPlotRound(plotChannel()) : null;
    if (!run) return privateJson({ mode, runId: null, partners: [] });
    const partners = run.pairs.flatMap((pair, index) => pair.first.user_id === session.person.id ? [{ ...pair.second, shared: pair.shared, note: pair.note, pairNumber: pair.pair_number ?? index + 1 }] : pair.second.user_id === session.person.id ? [{ ...pair.first, shared: pair.shared, note: pair.note, pairNumber: pair.pair_number ?? index + 1 }] : [])
      .filter(partner => partner.user_id !== session.person.id);
    const withPhotos = await Promise.all(partners.map(async partner => ({ ...partner, answers: await (partner.guest ? readGuestPlotAnswers(partner.user_id) : readPlotPartnerAnswers(partner.profile_id)).catch(() => null), photo: partner.guest ? null : partner.photo !== undefined ? partner.photo : await readPlotPartnerPhoto(partner.profile_id).catch(() => null) })));
    return privateJson({ mode, runId: run.id, partners: withPhotos });
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
