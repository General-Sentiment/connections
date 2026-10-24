import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { assertWrite, apiError, privateJson } from "@/lib/http";
import { plotPublisher, checkOutOfPlot, listPlotRuns, selectPlotRun, deletePlotRun, setPlotMode, plotModes, setPlotPrompt } from "@/lib/plot-pairings";
export async function GET() {
  try { const session = await requireSession(); return privateJson(await listPlotRuns(session.token)); }
  catch (error) { return apiError(error, { route: "/api/plot/runs", method: "GET" }); }
}
export async function PATCH(request: NextRequest) {
  try {
    assertWrite(request);
    const session = await requireSession();
    const input = z.union([z.object({ runId: z.number().int().positive() }).strict(), z.object({ mode: z.enum(plotModes) }).strict(), z.object({ activePrompt: z.enum(["one", "two", "three"]) }).strict()]).parse(await request.json());
    const result = "activePrompt" in input ? await setPlotPrompt(session.token, input.activePrompt) : "mode" in input ? await setPlotMode(session.token, input.mode) : await selectPlotRun(session.token, input.runId);
    revalidateTag("plot-pairings", { expire: 0 });
    return privateJson(result);
  } catch (error) { return apiError(error, { route: "/api/plot/runs", method: "PATCH" }); }
}

export async function DELETE(request: NextRequest) {
  try {
    assertWrite(request);
    const session = await requireSession();
    const input = z.union([z.object({ attendeeId: z.number().int().positive() }).strict(), z.object({ runId: z.number().int().positive() }).strict(), z.object({ all: z.literal(true) }).strict()]).parse(await request.json());
    if ("attendeeId" in input) {
      await plotPublisher(session.token);
      const result = await checkOutOfPlot(session.token, input.attendeeId);
      revalidateTag("plot-pairings", { expire: 0 });
      return privateJson(result);
    }
    const result = await deletePlotRun(session.token, "runId" in input ? input.runId : undefined);
    revalidateTag("plot-pairings", { expire: 0 });
    return privateJson(result);
  } catch (error) { return apiError(error, { route: "/api/plot/runs", method: "DELETE" }); }
}
