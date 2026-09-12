import { NextRequest } from "next/server";
import { assertWrite, apiError, privateJson } from "@/lib/http";
import { requireSession } from "@/lib/session";
import { saveProfile, deleteProfile } from "@/lib/profiles";
export async function DELETE(request: NextRequest) { try { assertWrite(request); const session = await requireSession(); const body = await request.json(); return privateJson(await deleteProfile(session.person, session.token, body.channelId)); } catch (e) { return apiError(e, { route: "/api/profile", method: "DELETE" }); } }
export async function POST(request: NextRequest) { try { assertWrite(request); const session = await requireSession(); return privateJson(await saveProfile(session.person, session.token, await request.json())); } catch (e) { return apiError(e, { route: "/api/profile", method: "POST" }); } }
export async function PATCH(request: NextRequest) { try { assertWrite(request); const session = await requireSession(); const { z } = await import("zod"); const body = z.object({ channelId: z.number().int().positive(), hidden: z.boolean() }).strict().parse(await request.json()); const { setProfileHidden } = await import("@/lib/profiles"); return privateJson(await setProfileHidden(session.person, session.token, body.channelId, body.hidden)); } catch (e) { return apiError(e, { route: "/api/profile", method: "PATCH" }); } }
