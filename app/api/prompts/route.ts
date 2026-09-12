import { profilePrompts } from "@/lib/prompts";
import { apiError, privateJson } from "@/lib/http";
import { requireSession } from "@/lib/session";
import { isDemo } from "@/lib/config";
export async function GET() {
  try {
    if (!isDemo()) await requireSession();
    return privateJson({ prompts: await profilePrompts() });
  } catch (error) { return apiError(error, { route: "/api/prompts", method: "GET" }); }
}

export async function POST(request: import("next/server").NextRequest) {
  try {
    const { assertWrite } = await import("@/lib/http");
    assertWrite(request);
    const session = await requireSession();
    const { z } = await import("zod");
    const { text } = z.object({ text: z.string().trim().min(1).max(2000) }).strict().parse(await request.json());
    const { ArenaClient } = await import("@/lib/arena");
    const client = new ArenaClient(session.token);
    const channel = await client.item("Channel", process.env.ARENA_PROPOSED_PROMPTS_CHANNEL || "proposed-prompts");
    const block = await client.request<{ id: number }>("/blocks", { method: "POST", body: { value: /^https?:\/\/\S+$/.test(text) ? `<${text}>` : text, channels: [{ id: channel.id }] } });
    return privateJson({ id: block.id });
  } catch (error) { return apiError(error, { route: "/api/prompts", method: "POST" }); }
}
