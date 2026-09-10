import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { Conversation } from "@/components/conversation";
import { getSession } from "@/lib/session";
import { isDemo } from "@/lib/config";
import { demoPeople } from "@/lib/demo";
import { ArenaClient } from "@/lib/arena";
import { conversationRef } from "@/lib/store";
import type { Person } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function NewConversation({ searchParams }: { searchParams: Promise<{ person?: string }> }) {
  const query = await searchParams; const demo = isDemo(); const session = await getSession(); const id = Number(query.person); let person: Person;
  if (!Number.isSafeInteger(id) || id <= 0) redirect("/");
  if (!demo && !session?.person) return <div className="page"><Header title="Connect" /><div className="notice"><p>Log in with Are.na to start a private conversation.</p><Link className="button" href={`/api/auth/login?next=${encodeURIComponent(`/connections/new?person=${id}`)}`}>Log in with Are.na →</Link></div></div>;
  if (session?.person?.id === id) redirect("/connections");
  if (demo) person = demoPeople.find(x => x.id === id) || demoPeople[0];
  else { const ref = conversationRef(session!.person!.id, id); if (ref) { const channel = await new ArenaClient(session!.token).item("Channel", ref.channel_id); if ((channel.collaborators || []).some(x => x.id === id || x.id === session!.person!.id)) redirect(`/connections/${ref.channel_id}`); } person = await new ArenaClient(session!.token).user(id); }
  return <div className="page chat-page"><Header title={`Connection: ${session?.person?.name || "Alex Lee"} & ${person.name}`} /><Conversation recipient={person} self={session?.person || demoPeople[1]} demo={demo} /></div>;
}
