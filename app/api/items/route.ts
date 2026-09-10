import { NextRequest } from "next/server";
import { ArenaClient } from "@/lib/arena";
import { requireSession } from "@/lib/session";
import { apiError, privateJson } from "@/lib/http";
import { parseArenaUrl } from "@/lib/urls";
import { isDemo } from "@/lib/config";
import { demoBlocks, demoChannel, demoPeople } from "@/lib/demo";
import type { Item, Page } from "@/lib/types";
export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams; const type = query.get("type") === "Channel" ? "Channel" : "Block";
    const page = Math.min(10000, Math.max(1, Number(query.get("page")) || 1)); const search = (query.get("q") || "").slice(0, 200); const url = query.get("url");
    if (isDemo()) {
      const items = type === "Block" ? demoBlocks : [demoChannel(700030, "Ways of gathering", demoPeople[0], 24), demoChannel(700031, "Public spaces", demoPeople[0], 41), demoChannel(700032, "Printed matter", demoPeople[0], 28)];
      return privateJson({ data: items.filter(x => !search || x.title?.toLowerCase().includes(search.toLowerCase())), meta: { has_more_pages: false, next_page: null }, scope: "Sample items" });
    }
    const session = await requireSession(); const client = new ArenaClient(session.token);
    if (url) { const ref = parseArenaUrl(url); return privateJson({ data: [await client.item(ref.type, ref.id)] }); }
    let result: Page<Item>; let scope = "";
    if (search && ["premium", "supporter", "lifetime"].includes(session.person.tier?.toLowerCase() || "")) {
      result = await client.request<Page<Item>>(`/search?query=${encodeURIComponent(search)}&user_id=${session.person.id}&type=${type}&page=${page}&per=24`);
    } else {
      result = await client.userContents(session.person.id, type, page);
      if (search) { result.data = result.data.filter(x => x.title?.toLowerCase().includes(search.toLowerCase())); scope = "Searching this page · load more to search older items"; }
    }
    result.data = result.data.filter(x => x.visibility !== "private" && x.state === "available" && x.metadata?.app !== "connections" && (x.type === "Channel" ? x.owner?.type === "User" && x.owner.id === session.person.id : x.user?.id === session.person.id));
    return privateJson({ ...result, scope });
  } catch (e) { return apiError(e); }
}
