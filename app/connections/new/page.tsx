import { Welcome, hasConnection } from "@/components/welcome";
import Link from "@/components/app-link";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { Conversation } from "@/components/conversation";
import { getSession } from "@/lib/session";
import { isDemo } from "@/lib/config";
import { demoPeople } from "@/lib/demo";
import { ArenaClient } from "@/lib/arena";
import { findConversation, assertParticipant } from "@/lib/conversations";
import type { Person } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function NewConversation({ searchParams }: { searchParams: Promise<{ person?: string }> }) {
  if (!await hasConnection()) return <Welcome />;
  const query = await searchParams; const demo = isDemo(); const session = await getSession(); const id = Number(query.person); let person: Person;
  if (!Number.isSafeInteger(id) || id <= 0) redirect("/");
  if (!demo && !session?.person) return <div className="page"><Header parent="Connections" back="/connections" title="Connect" /><div className="notice"><p>Log in with Are.na to start a private conversation.</p><Link className="button" href={`/api/auth/login?next=${encodeURIComponent(`/connections/new?person=${id}`)}`}>Log in with Are.na →</Link></div></div>;
  if (session?.person?.id === id) redirect("/connections");
  if (demo) person = demoPeople.find(x => x.id === id) || demoPeople[0];
  else { const client = new ArenaClient(session!.token); const channel = await findConversation(client, session!.person!, id); if (channel) { try { assertParticipant(channel, session!.person!.id); redirect(`/connections/${channel.id}`); } catch (error) { if (!(error instanceof Error) || error.message.startsWith("NEXT_REDIRECT")) throw error; } } person = await client.user(id); }
  return <div className="page chat-page"><Header parent="Connections" back="/connections" title={`Connection: ${session?.person?.name || "Alex Lee"} & ${person.name}`} /><Conversation recipient={person} self={session?.person || demoPeople[1]} demo={demo} /></div>;
}
