import { NextRequest } from "next/server";
import { ArenaClient } from "@/lib/arena";
import { apiError, assertWrite, privateJson } from "@/lib/http";
import { requireSession } from "@/lib/session";
import { assertParticipant, groupMessages, sendMessage } from "@/lib/conversations";
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { const session = await requireSession(); const { id } = await context.params; if (!/^\d+$/.test(id)) throw new Error("Invalid channel."); const client = new ArenaClient(session.token); const channel = await client.item("Channel", id); assertParticipant(channel, session.person.id);
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1); const content = await client.contents(id, page, 24, "position_desc");
    return privateJson({ messages: groupMessages(content.data), next: content.meta.next_page });
  } catch (e) { return apiError(e); }
}
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { assertWrite(request); const session = await requireSession(); const { id } = await context.params; if (!/^\d+$/.test(id)) throw new Error("Invalid channel."); return privateJson(await sendMessage(new ArenaClient(session.token), session.person, Number(id), await request.json())); } catch (e) { return apiError(e); }
}
