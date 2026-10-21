import { revalidateTag } from "next/cache";
import { NextRequest } from "next/server";
import { assertWrite, apiError, privateJson } from "@/lib/http";
import { requireSession } from "@/lib/session";
import { plotAnswerSchema, savePlotAnswer } from "@/lib/plot-answers";
export async function POST(request: NextRequest) {
  try {
    assertWrite(request);
    const session = await requireSession();
    const result = await savePlotAnswer(session.person, session.token, plotAnswerSchema.parse(await request.json()));
    revalidateTag("plot-profile-answers", { expire: 0 });
    return privateJson(result);
  } catch (error) { return apiError(error, { route: "/api/plot/answer", method: "POST" }); }
}
