import Link from "./app-link";
import { getSession } from "@/lib/session";
import { ArenaClient } from "@/lib/arena";
import { availableProfileRef } from "@/lib/profiles";
import { allConversations } from "@/lib/conversations";
import { safeUrl } from "@/lib/urls";
export async function AccountBar() {
  const session = await getSession();
  if (!session?.person || !session.token) return null;
  const person = session.person;
  const client = new ArenaClient(session.token);
  const [profile, connections] = await Promise.allSettled([availableProfileRef(person.id, client), allConversations(client, person)]);
  const hasProfile = profile.status === "fulfilled" && Boolean(profile.value);
  const label = profile.status === "rejected" ? "Profile" : hasProfile ? "My profile" : "Create profile";
  const avatar = safeUrl(person.avatar);
  return <nav className="account-bar" aria-label="Account navigation">
    <Link href="/" className="account-home" aria-label="Connections home"><svg width="36" height="24" viewBox="0 0 54 36" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><circle cx="17" cy="18" r="14" /><circle cx="37" cy="18" r="14" /></svg></Link>
    <div className="account-bar-actions">
      <Link href="/profile/edit" className={`button${profile.status === "fulfilled" && !hasProfile ? " profile-primary" : ""}`}>{label}{profile.status === "fulfilled" && !hasProfile && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" aria-hidden="true"><path d="M12 3v18M3 12h18" /></svg>}</Link>
      <Link href="/connections" className="button account-count" aria-label={connections.status === "fulfilled" ? `${connections.value.length} connections` : "View connections"}>{connections.status === "fulfilled" ? connections.value.length : "—"}</Link>
      <a className="account-avatar" href={`https://www.are.na/${encodeURIComponent(person.slug)}`} target="_blank" rel="noopener noreferrer" aria-label={`${person.name} on Are.na`}>{avatar ? <img src={avatar} alt="" /> : <span>{person.name.slice(0, 1)}</span>}</a>
    </div>
  </nav>;
}
