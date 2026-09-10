import Link from "next/link";
import { Header } from "@/components/header";
import { Conversation } from "@/components/conversation";
import { getSession } from "@/lib/session";
import { isDemo } from "@/lib/config";
import { ArenaClient } from "@/lib/arena";
import { demoPeople, demoMessages } from "@/lib/demo";
import { assertParticipant, groupMessages } from "@/lib/conversations";
import { arenaUrl } from "@/lib/urls";
export const dynamic = "force-dynamic";
export default async function Thread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const session = await getSession();
  if (isDemo()) return <div className="page chat-page"><Header title="Connection: Maya Chen & Alex Lee" /><Conversation recipient={demoPeople[0]} self={demoPeople[1]} initialMessages={demoMessages} demo /></div>;
  if (!session?.person || !session.token) return <div className="page"><Header title="Private conversation" /><Link className="button" href={`/api/auth/login?next=${encodeURIComponent(`/connections/${id}`)}`}>Log in with Are.na →</Link></div>;
  try { const client = new ArenaClient(session.token); const channel = await client.item("Channel", id); const people = assertParticipant(channel, session.person.id); const recipient = people.find(p => p.id !== session.person!.id)!; const contents = await client.contents(id, 1, 24, "position_desc");
    return <div className="page chat-page"><Header title={channel.title || "Connection"} actions={<a className="quiet-link" href={arenaUrl(channel)} target="_blank" rel="noreferrer">View on Are.na ↗</a>} /><Conversation channelId={channel.id} recipient={recipient} self={session.person} initialMessages={groupMessages(contents.data)} initialNext={contents.meta.next_page} /></div>;
  } catch (e) { return <div className="page"><Header title="Private conversation" /><p className="notice error">{e instanceof Error ? e.message : "This conversation is unavailable."}</p><Link href="/connections">← My connections</Link></div>; }
}
