import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { assertWrite, apiError, privateJson } from "@/lib/http";
import { saveGuestPlotAnswer } from "@/lib/plot-guests";
export async function POST(request: NextRequest) {
  try {
    assertWrite(request);
    const guest = (await getSession())?.plotGuest;
    if (!guest) throw new Error("Enter your name on Plot before answering.");
    const input = z.object({ promptId: z.number().int().positive(), text: z.string().trim().min(1).max(5000), requestId: z.string().uuid() }).strict().parse(await request.json());
    const result = await saveGuestPlotAnswer(guest, input.promptId, input.text, input.requestId);
    revalidateTag("plot-pairings", { expire: 0 });
    revalidateTag("plot-profile-answers", { expire: 0 });
    return privateJson(result);
  } catch (error) { return apiError(error, { route: "/api/plot/guest-answer", method: "POST" }); }
}
