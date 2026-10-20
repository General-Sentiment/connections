import { NextRequest } from "next/server";
import { assertWrite, apiError, privateJson } from "@/lib/http";
import { requireSession } from "@/lib/session";
import { plotAnswerSchema, savePlotAnswer } from "@/lib/plot-answers";
export async function POST(request: NextRequest) {
  try {
    assertWrite(request);
    const session = await requireSession();
    return privateJson(await savePlotAnswer(session.person, session.token, plotAnswerSchema.parse(await request.json())));
  } catch (error) { return apiError(error, { route: "/api/plot/answer", method: "POST" }); }
}
