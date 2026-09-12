import { NextRequest } from "next/server";
import { ArenaError } from "@/lib/arena";
import { groupId } from "@/lib/config";
import { requireSession } from "@/lib/session";
import { assertWrite, apiError, privateJson } from "@/lib/http";
import { directoryClient } from "@/lib/directory-auth";
export async function POST(request: NextRequest) {
  try {
    assertWrite(request);
    const session = await requireSession();
    if (!groupId()) throw new Error("Set ARENA_GROUP_ID in the server environment first.");
    const client = await directoryClient(session.token);
    const group = await client.request<{ user: { id: number } }>(`/groups/${groupId()}`);
    if (group.user.id !== session.person.id) throw new ArenaError(403, "Only the group owner can check setup.");
    return privateJson({ configured: true });
  } catch (error) { return apiError(error, { route: "/api/setup", method: "POST" }); }
}
