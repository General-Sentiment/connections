import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { assertWrite, apiError, privateJson } from "@/lib/http";
import { getSession } from "@/lib/session";
import { guestInput, registerPlotGuest } from "@/lib/plot-guests";
export async function POST(request: NextRequest) {
  try {
    assertWrite(request);
    const session = await getSession();
    if (!session) throw new Error("Guest sessions are temporarily unavailable. Your details are saved on this device.");
    session.plotGuest = await registerPlotGuest(guestInput.parse(await request.json()));
    await session.save();
    revalidateTag("plot-pairings", { expire: 0 });
    return privateJson(session.plotGuest);
  } catch (error) { return apiError(error, { route: "/api/plot/guest", method: "POST" }); }
}
