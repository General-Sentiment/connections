import { NextRequest } from "next/server";
import { ArenaClient, ArenaError } from "@/lib/arena";
import { appUrl, directoryId } from "@/lib/config";
import { requireSession } from "@/lib/session";
import { apiError, privateJson } from "@/lib/http";
import { setSetting, withLock } from "@/lib/store";
import type { Item, Owner, Page } from "@/lib/types";
import { saveDirectoryCredential } from "@/lib/directory-auth";
export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== new URL(appUrl()).origin) throw new ArenaError(403, "Invalid request origin.");
    const session = await requireSession(); const client = new ArenaClient(session.token);
    const result = await withLock("setup", async () => {
      const group = await client.request<{ id: number; user: Owner }>("/groups/connections-forum");
      if (group.user.id !== session.person.id) throw new ArenaError(403, "Only the Connections group owner can set up the directory.");
      await saveDirectoryCredential(session.token);
      setSetting("group", String(group.id));
      if (!directoryId()) {
        const contents = await client.request<Page<Item>>(`/groups/${group.id}/contents?type=Channel&per=24`);
        let directory = contents.data.find(x => x.metadata?.app === "connections" && x.metadata.role === "directory");
        if (!directory) directory = await client.createChannel("Connections", { owner: { type: "Group", id: group.id }, metadata: { app: "connections", role: "directory", schema_version: 1 } });
        setSetting("directory", String(directory.id));
      }
      setSetting("live", "true"); return { configured: true };
    }); return privateJson(result);
  } catch (e) { return apiError(e); }
}
