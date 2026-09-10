import { NextRequest } from "next/server";
import { assertWrite, apiError, privateJson } from "@/lib/http";
import { requireSession } from "@/lib/session";
import { saveProfile } from "@/lib/profiles";
export async function POST(request: NextRequest) { try { assertWrite(request); const session = await requireSession(); return privateJson(await saveProfile(session.person, session.token, await request.json())); } catch (e) { return apiError(e); } }
