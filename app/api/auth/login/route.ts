import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { getSession } from "@/lib/session";
import { appUrl } from "@/lib/config";
export async function GET(request: NextRequest) {
  const session = await getSession(); if (!session) return NextResponse.redirect(new URL("/setup", appUrl()));
  const next = request.nextUrl.searchParams.get("next") || "/";
  const verifier = randomBytes(32).toString("base64url");
  session.oauth = { state: randomBytes(24).toString("base64url"), verifier, next: next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/", created: Date.now() };
  await session.save();
  const url = new URL("https://www.are.na/oauth/authorize");
  url.search = new URLSearchParams({ client_id: process.env.ARENA_CLIENT_ID!, redirect_uri: `${appUrl()}/api/auth/callback`, response_type: "code", scope: "write", state: session.oauth.state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" }).toString();
  return NextResponse.redirect(url);
}
