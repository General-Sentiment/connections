import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { ArenaClient } from "@/lib/arena";
import { appUrl } from "@/lib/config";
import { discoverConversations } from "@/lib/conversations";
export async function GET(request: NextRequest) {
  const session = await getSession(); const oauth = session?.oauth;
  const fail = (message: string) => NextResponse.redirect(new URL(`/?error=${encodeURIComponent(message)}`, appUrl()));
  if (!session || !oauth || request.nextUrl.searchParams.get("state") !== oauth.state || Date.now() - oauth.created > 600000) return fail("This login request expired. Please try again.");
  delete session.oauth; await session.save();
  const code = request.nextUrl.searchParams.get("code"); if (!code) return fail("Are.na login was not completed.");
  try {
    const response = await fetch("https://api.are.na/v3/oauth/token", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(20000), body: JSON.stringify({ grant_type: "authorization_code", code, client_id: process.env.ARENA_CLIENT_ID, ...(process.env.ARENA_CLIENT_SECRET ? { client_secret: process.env.ARENA_CLIENT_SECRET } : {}), redirect_uri: `${appUrl()}/api/auth/callback`, code_verifier: oauth.verifier }) });
    if (!response.ok) return fail("Are.na could not finish login. Please try again.");
    const result = await response.json() as { access_token?: string }; if (!result.access_token) return fail("Are.na did not return a login token.");
    const person = await new ArenaClient(result.access_token).me();
    session.token = result.access_token; session.person = { id: person.id, type: "User", name: person.name, slug: person.slug, avatar: person.avatar, tier: person.tier }; await session.save();
    // One page on login; access is verified before importing any channel reference.
    await discoverConversations(new ArenaClient(result.access_token), session.person).catch(() => undefined);
    return NextResponse.redirect(new URL(oauth.next, appUrl()));
  } catch { return fail("Could not reach Are.na. Please try logging in again."); }
}
