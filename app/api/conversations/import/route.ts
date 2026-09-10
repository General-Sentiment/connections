import { NextRequest } from "next/server";
import { z } from "zod";
import { ArenaClient } from "@/lib/arena";
import { apiError, assertWrite, privateJson } from "@/lib/http";
import { requireSession } from "@/lib/session";
import { assertParticipant } from "@/lib/conversations";
import { parseArenaUrl } from "@/lib/urls";
export async function POST(request: NextRequest) {
  try { assertWrite(request); const session = await requireSession(); const { url } = z.object({ url: z.string().max(1000) }).parse(await request.json()); const ref = parseArenaUrl(url); if (ref.type !== "Channel") throw new Error("Choose a private conversation channel."); const channel = await new ArenaClient(session.token).item("Channel", ref.id); assertParticipant(channel, session.person.id); return privateJson({ channelId: channel.id }); } catch (e) { return apiError(e); }
}
