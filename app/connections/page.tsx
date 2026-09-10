import { Welcome, hasConnection } from "@/components/welcome";
import Link from "next/link";
import { Header } from "@/components/header";
import { Card } from "@/components/card";
import { ImportConversation } from "@/components/import-conversation";
import { getSession } from "@/lib/session";
import { isDemo } from "@/lib/config";
import { ArenaClient } from "@/lib/arena";
import { discoverConversations } from "@/lib/conversations";
import { demoChannel, demoPeople } from "@/lib/demo";
import type { Item } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function Connections({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  if (!await hasConnection()) return <Welcome />;
  const query = await searchParams; const demo = isDemo(); const session = await getSession(); let channels: Item[] = []; let error = ""; let limited = false; let next: number | null = null;
  if (demo) channels = [{ ...demoChannel(600001, "Connection: Maya Chen & Alex Lee", demoPeople[1], 3), visibility: "private" }];
  else if (session?.person && session.token) try { const result = await discoverConversations(new ArenaClient(session.token), session.person, Math.max(1, Number(query.page) || 1)); channels = result.channels; limited = result.limited; next = result.next; } catch (e) { error = e instanceof Error ? e.message : "Could not load conversations."; }
  return <div className="page"><Header title="My connections" />{!demo && !session?.person ? <div className="notice"><p>Log in to see your private conversations.</p><Link className="button" href="/api/auth/login?next=/connections">Log in with Are.na →</Link></div> : <><p className="privacy-note">Your conversations are private channels owned by you or your connection. The directory group has no access.</p>{error && <p className="notice error">{error}</p>}<div className="grid">{channels.map(channel => <Card key={channel.id} item={channel} href={`/connections/${channel.id}`} />)}</div>{!channels.length && !error && <p className="empty">No connections yet. <Link href="/">Find someone to connect with →</Link></p>}{next && <Link className="button" href={`/connections?page=${next}`}>Load more →</Link>}{limited && <p className="small muted">Are.na search is unavailable for this account. Showing owned and previously opened conversations. You can open another shared channel by its URL.</p>}{!demo && <ImportConversation />}</>}{demo && <p className="preview-note">Preview · Sample conversation.</p>}</div>;
}
