import { NextRequest } from "next/server";
import { ArenaClient } from "@/lib/arena";
import { apiError, privateJson } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const user = Number(request.nextUrl.searchParams.get("user"));
    if (!Number.isSafeInteger(user) || user <= 0) return Response.json({ error: "Invalid person." }, { status: 400 });
    const type = request.nextUrl.searchParams.get("type") === "Channel" ? "Channel" : "Block";
    const result = await new ArenaClient().request<{ data: import("@/lib/types").Item[] }>(`/users/${user}/contents?type=${type}&per=100&page=1&sort=updated_at_desc`);
    return privateJson({ data: result.data.filter(item => item.state === "available" && item.visibility !== "private" && item.metadata?.app !== "connections" && !item.title?.startsWith("Connection:") && (item.type === "Channel" ? item.owner?.type === "User" && item.owner.id === user : item.user?.id === user)) });
  } catch (error) { return apiError(error); }
}
