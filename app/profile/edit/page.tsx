import Link from "next/link";
import { Header } from "@/components/header";
import { ProfileForm } from "@/components/profile-form";
import { getSession } from "@/lib/session";
import { isDemo } from "@/lib/config";
import { demoPeople } from "@/lib/demo";
import { profileRef } from "@/lib/store";
import { readProfile } from "@/lib/profiles";
import { ArenaClient } from "@/lib/arena";
import type { Profile } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function EditProfile() {
  const session = await getSession(); const demo = isDemo(); let profile: Profile | undefined; let error = "";
  if (session?.person && !demo) { const ref = profileRef(session.person.id); if (ref) try { profile = await readProfile(ref.channel_id, new ArenaClient(session.token)); } catch (e) { error = e instanceof Error ? e.message : "Could not load your profile."; } }
  return <div className="page"><Header title={profile ? "Edit profile" : "Add yourself"} />{error ? <p className="notice error">{error}</p> : !demo && !session?.person ? <div className="notice"><p>Log in with Are.na to add yourself. Logging in does not publish a profile.</p><Link className="button" href="/api/auth/login?next=/profile/edit">Log in with Are.na →</Link></div> : <ProfileForm person={session?.person || demoPeople[0]} profile={profile} demo={demo} />}{demo && <p className="preview-note">Preview · Changes are not published.</p>}</div>;
}
