import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { ArenaError } from "./arena";
import { appUrl, isDemo } from "./config";
export function assertWrite(request: NextRequest) {
  if (request.headers.get("origin") !== new URL(appUrl()).origin) throw new ArenaError(403, "This request did not come from Connections.");
  if (isDemo()) throw new ArenaError(409, "Preview mode does not publish changes to Are.na.");
}
export function apiError(error: unknown) {
  const status = error instanceof ZodError ? 400 : error instanceof ArenaError ? error.status : 400;
  const message = error instanceof ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "Something went wrong. Please try again.";
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store", ...(error instanceof ArenaError && error.retryAfter ? { "Retry-After": error.retryAfter } : {}) } });
}
export function privateJson(data: unknown) { return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } }); }
