import { NextRequest } from "next/server";
import { z } from "zod";
import { ArenaClient } from "@/lib/arena";
import { apiError, assertWrite, privateJson } from "@/lib/http";
import { requireSession } from "@/lib/session";
import { ensureConversation, messageSchema, sendMessage } from "@/lib/conversations";
export async function POST(request: NextRequest) {
  try { assertWrite(request); const session = await requireSession(); const raw = z.object({ personId: z.number().int().positive(), message: messageSchema }).strict().parse(await request.json());
    const client = new ArenaClient(session.token); const recipient = await client.user(raw.personId);
    const channel = await ensureConversation(client, session.token, session.person, recipient);
    return privateJson(await sendMessage(client, session.person, channel.id, raw.message));
  } catch (e) { return apiError(e, { route: "/api/conversations", method: "POST" }); }
}
