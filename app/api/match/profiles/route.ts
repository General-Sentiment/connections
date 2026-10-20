import { groupId, isDemo } from "@/lib/config";
import { demoProfiles } from "@/lib/demo";
import { getSession } from "@/lib/session";
import { apiError, privateJson } from "@/lib/http";
import { loadMatchProfiles } from "@/lib/match-profiles";
import { ArenaError } from "@/lib/arena";

export async function GET() {
  try {
    if (isDemo()) return privateJson({ profiles: demoProfiles, skipped: 0 });
    const session = await getSession();
    if (!session?.token || !session.person) throw new ArenaError(401, "Log in to match profiles.");
    const group = groupId();
    if (!group) throw new ArenaError(503, "The directory is being set up. Try again later.");
    const encoder = new TextEncoder();
    let closed = false;
    const stream = new ReadableStream({
      async start(controller) {
        const send = (value: unknown) => {
          if (!closed) controller.enqueue(encoder.encode(JSON.stringify(value) + "\n"));
        };
        send({ status: "loading" });
        const heartbeat = setInterval(() => send({ status: "loading" }), 10000);
        try {
          const result = await loadMatchProfiles(group, (loaded, total) => send({ status: "loading", loaded, total }));
          send({ status: "complete", ...result });
        } catch (error) {
          send({ status: "error", error: error instanceof Error ? error.message : "Profiles couldn’t be loaded. Try again." });
        } finally {
          clearInterval(heartbeat);
          if (!closed) { closed = true; controller.close(); }
        }
      },
      cancel() { closed = true; },
    });
    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "private, no-store", "X-Accel-Buffering": "no" } });
  } catch (error) { return apiError(error, { route: "/api/match/profiles", method: "GET" }); }
}
