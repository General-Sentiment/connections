import { NextRequest, NextResponse } from "next/server";
import { logServerError } from "@/lib/logging";
import { getSession } from "@/lib/session";
import { ArenaClient } from "@/lib/arena";
import { appUrl } from "@/lib/config";
import { discoverConversations } from "@/lib/conversations";
export async function GET(request: NextRequest) {
  const session = await getSession(); const oauth = session?.oauth;
  const fail = (event: string, message: string, error?: unknown, status?: number) => {
    logServerError(error, { event, route: "/api/auth/callback", method: "GET", status });
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(message)}`, appUrl()));
  };
  if (!session || !oauth || request.nextUrl.searchParams.get("state") !== oauth.state || Date.now() - oauth.created > 600000) return fail("auth.invalid_state", "This login request expired. Please try again.");
  delete session.oauth; await session.save();
  const code = request.nextUrl.searchParams.get("code"); if (!code) return fail("auth.missing_code", "Are.na login was not completed.");
  try {
    const response = await fetch("https://api.are.na/v3/oauth/token", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(20000), body: JSON.stringify({ grant_type: "authorization_code", code, client_id: process.env.ARENA_CLIENT_ID, ...(process.env.ARENA_CLIENT_SECRET ? { client_secret: process.env.ARENA_CLIENT_SECRET } : {}), redirect_uri: `${appUrl()}/api/auth/callback`, code_verifier: oauth.verifier }) });
    if (!response.ok) return fail("auth.token_exchange_failed", "Are.na could not finish login. Please try again.", undefined, response.status);
    const result = await response.json() as { access_token?: string }; if (!result.access_token) return fail("auth.missing_token", "Are.na did not return a login token.");
    const person = await new ArenaClient(result.access_token).me();
    session.token = result.access_token; session.person = { id: person.id, type: "User", name: person.name, slug: person.slug, avatar: person.avatar, tier: person.tier }; await session.save();
    // One page on login; access is verified before importing any channel reference.
    await discoverConversations(new ArenaClient(result.access_token), session.person).catch(error => logServerError(error, { event: "auth.conversation_discovery_failed", route: "/api/auth/callback", method: "GET" }));
    const destination = new URL(oauth.next, appUrl());
    destination.searchParams.set("intro", "skip");
    return NextResponse.redirect(destination);
  } catch (error) { return fail("auth.callback_failed", "Could not reach Are.na. Please try logging in again.", error); }
}
