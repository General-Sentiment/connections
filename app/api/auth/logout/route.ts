import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { appUrl } from "@/lib/config";
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== new URL(appUrl()).origin) return new Response(null, { status: 403 });
  const session = await getSession(); session?.destroy(); return NextResponse.redirect(new URL("/", appUrl()), 303);
}
