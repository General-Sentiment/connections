import { arenaUrl } from "@/lib/urls";
import { Welcome, hasConnection } from "@/components/welcome";
import Link from "@/components/app-link";
import { Header } from "@/components/header";
import { ProfileForm } from "@/components/profile-form";
import { getSession } from "@/lib/session";
import { isDemo } from "@/lib/config";
import { demoPeople } from "@/lib/demo";
import { readProfile, availableProfileRef } from "@/lib/profiles";
import { ArenaClient } from "@/lib/arena";
import type { Profile } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function EditProfile() {
  if (!await hasConnection()) return <Welcome />;
  const session = await getSession(); const demo = isDemo(); let profile: Profile | undefined; let error = "";
  if (session?.person && !demo) {
    try {
      const client = new ArenaClient(session.token);
      const ref = await availableProfileRef(session.person.id, client);
      if (ref) profile = await readProfile(ref.channel_id, client);
    } catch (e) { error = e instanceof Error ? e.message : "Could not load your profile."; }
  }
  return <div className="page"><Header hideArena={!profile} arenaHref={profile ? arenaUrl(profile.channel) : undefined} parent={profile ? "Edit" : "Create"} title={session?.person?.name || demoPeople[0].name} titleHref={`https://www.are.na/${encodeURIComponent(session?.person?.slug || demoPeople[0].slug)}`} />{error ? <p className="notice error">{error}</p> : !demo && !session?.person ? <div className="notice"><p>Log in with Are.na to add yourself. Logging in does not publish a profile.</p><Link className="button" href="/api/auth/login?next=/profile/edit">Log in with Are.na →</Link></div> : <ProfileForm person={session?.person || demoPeople[0]} profile={profile} demo={demo} />}{demo && <p className="preview-note">Preview · Changes are not published.</p>}</div>;
}
