import { NextRequest } from "next/server";
import { ArenaClient, ArenaError } from "@/lib/arena";
import { assertWrite, apiError, privateJson } from "@/lib/http";
import { requireSession } from "@/lib/session";
import { groupId } from "@/lib/config";
import { serializeDetails } from "@/lib/details";
import { addIndividualCollaborator, participants } from "@/lib/conversations";

// Development-only smoke check. The optional pair check grants jk-testing
// access to labeled test content; the temporary private channel is removed.
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  let client: ArenaClient | undefined; let channelId: number | undefined; const results: Record<string, unknown> = {};
  try {
    assertWrite(request); const session = await requireSession(); client = new ArenaClient(session.token);
    const group = await client.request<{ user: { id: number } }>(`/groups/${groupId()}`);
    if (group.user.id !== session.person.id) throw new ArenaError(403, "Only the directory owner can run the development check.");
    const channel = await client.createChannel("Connections integration check", { visibility: "private", metadata: { app: "connections", role: "test" } }); channelId = channel.id;
    const created = await client.createBlock(channel.id, "details", serializeDetails({ schema: "connections_profile", version: 1, location: { city: "Test city", country: "Test country" }, open_to: ["conversation"], local_only: false }), "details");
    await client.updateBlock(created.id, { title: "details", content: serializeDetails({ schema: "connections_profile", version: 1, location: { city: "Updated test city", country: "Test country" }, open_to: ["friendship"], local_only: true }) });
    const link = await client.createBlock(channel.id, session.person.name, `https://www.are.na/${session.person.slug}`, "profile_link");
    const content = await client.contents(channel.id, 1, 24); const read = content.data.find(x => x.id === created.id);
    Object.assign(results, { channelCreated: channel.owner?.type === "User" && channel.visibility === "private", detailsRoundTrip: read?.content?.markdown.includes("Updated test city"), profileLinkCreated: Boolean(link.id), roleMetadata: read?.connection?.metadata?.role === "details" });
    try { await new ArenaClient().item("Channel", channel.id); results.anonymousAccessDenied = false; } catch (e) { results.anonymousAccessDenied = e instanceof ArenaError && [401, 403, 404].includes(e.status); }
    // The owner is already authorized. This probes the compatibility write
    // without granting a new person access or notifying anybody else.
    try { await addIndividualCollaborator(session.token, channel.id, session.person.id); results.collaboratorCompatibility = "accepted owner-only probe"; } catch (e) { results.collaboratorCompatibility = e instanceof Error ? e.message : "failed"; }
    if (request.nextUrl.searchParams.get("pair") === "true") {
      const tester = await client.user("jk-testing");
      await client.updateChannel(channel.id, { title: `Connection: ${session.person.name} & ${tester.name}` });
      await addIndividualCollaborator(session.token, channel.id, tester.id);
      const shared = await client.item("Channel", channel.id);
      const members = participants(shared);
      results.twoIndividualParticipants = members.length === 2 && members.some(x => x.id === session.person.id) && members.some(x => x.id === tester.id);
      results.directoryGroupExcluded = shared.owner?.type === "User" && shared.collaborators?.every(x => x.type === "User");
    }
  } catch (e) { return apiError(e, { route: "/api/dev/check", method: "POST" }); }
  finally { if (client && channelId) { try { await client.request(`/channels/${channelId}`, { method: "DELETE" }); results.cleanup = true; } catch { results.cleanup = false; results.remainingTestChannel = channelId; } } }
  return privateJson(results);
}
