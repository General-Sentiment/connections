import { NextRequest } from "next/server";
import { z } from "zod";
import { ArenaClient } from "@/lib/arena";
import { assertWrite, apiError, privateJson } from "@/lib/http";
import { requireSession } from "@/lib/session";
import { database } from "@/lib/store";
const schema = z.object({ filename: z.string().min(1).max(200), contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]), size: z.number().positive().max(10 * 1024 * 1024) });
export async function POST(request: NextRequest) {
  try {
    assertWrite(request); const session = await requireSession(); const input = schema.parse(await request.json());
    const response = await new ArenaClient(session.token).request<{ files: { key: string; upload_url: string; content_type: string }[] }>("/uploads/presign", { method: "POST", body: { files: [{ filename: input.filename, content_type: input.contentType }] } });
    const file = response.files[0]; if (!file) throw new Error("Are.na did not return an upload URL.");
    database().prepare("INSERT OR REPLACE INTO uploads VALUES(?,?,?)").run(file.key, session.person.id, Date.now() + 3600000);
    return privateJson(file);
  } catch (e) { return apiError(e); }
}
