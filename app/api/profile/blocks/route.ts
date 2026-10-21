import { revalidateTag } from "next/cache";
import { NextRequest } from "next/server";
import { assertWrite, apiError, privateJson } from "@/lib/http";
import { requireSession } from "@/lib/session";
import { createProfileBlock, createProfileBlockSchema } from "@/lib/create-profile-block";
import { savePlotAnswer } from "@/lib/plot-answers";
import { readActivePlotPrompt, readPlotPrompt } from "@/lib/plot-pairings";
import { ArenaClient, ArenaError } from "@/lib/arena";
export async function POST(request: NextRequest) {
  try {
    assertWrite(request);
    const session = await requireSession();
    const input = createProfileBlockSchema.parse(await request.json());
    if (input.plotPromptId) {
      const prompt = await readPlotPrompt(await readActivePlotPrompt());
      if (prompt.id !== input.plotPromptId) throw new ArenaError(409, "The Plot prompt changed. Refresh before adding a block.");
    }
    let item = await createProfileBlock(session.person, session.token, input);
    if (input.plotPromptId && item.state !== "available") {
      const client = new ArenaClient(session.token);
      for (let attempt = 0; attempt < 5 && item.state !== "available"; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        item = await client.item("Block", item.id);
      }
      if (item.state !== "available") throw new ArenaError(409, "Are.na is still processing your block. Wait a moment and click Add block again; it won’t create a duplicate.");
    }
    if (input.plotPromptId) await savePlotAnswer(session.person, session.token, { promptId: input.plotPromptId, answer: { id: item.id, type: "Block" }, description: "" }, false);
    revalidateTag("plot-profile-answers", { expire: 0 });
    return privateJson({ item });
  } catch (error) { return apiError(error, { route: "/api/profile/blocks", method: "POST" }); }
}
