import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import type { Person } from "./types";
import { authReady } from "./config";
export type Session = { token?: string; person?: Person; oauth?: { state: string; verifier: string; next: string; created: number } };
export async function getSession() {
  if (!authReady()) return null;
  return getIronSession<Session>(await cookies(), { password: process.env.SESSION_SECRET!, cookieName: "connections_session", ttl: 60 * 60 * 24 * 30, cookieOptions: { secure: process.env.APP_URL?.startsWith("https://") || false, httpOnly: true, sameSite: "lax", path: "/" } });
}
export async function requireSession() { const session = await getSession(); if (!session?.token || !session.person) throw new Error("Log in with Are.na to continue."); return session as typeof session & { token: string; person: Person }; }
