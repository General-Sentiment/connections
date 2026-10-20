import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { requireSession } from "@/lib/session";
import { assertWrite, apiError, privateJson } from "@/lib/http";
import { checkInToPlot } from "@/lib/plot-pairings";
export async function POST(request: NextRequest) {
  try {
    assertWrite(request);
    const session = await requireSession();
    const result = await checkInToPlot(session.token, session.person.id);
    revalidateTag("plot-pairings", { expire: 0 });
    return privateJson(result);
  } catch (error) { return apiError(error, { route: "/api/plot/checkin", method: "POST" }); }
}
