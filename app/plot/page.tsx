import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { ProfileForm } from "@/components/profile-form";
import { getSession } from "@/lib/session";
import { ArenaClient } from "@/lib/arena";
import { availableProfileRef } from "@/lib/profiles";
import { logServerError } from "@/lib/logging";

export const dynamic = "force-dynamic";

export default async function Plot() {
  const session = await getSession();
  if (!session?.person || !session.token) redirect("/api/auth/login?next=/plot");
  let complete = false;
  let error = "";
  if (session?.person && session.token) {
    try {
      const ref = await availableProfileRef(session.person.id, new ArenaClient(session.token));
      complete = Boolean(ref?.published);
    } catch (cause) {
      logServerError(cause, { event: "page.load_failed", route: "/plot", method: "GET" });
      error = "We couldn’t check your profile. Please refresh to try again.";
    }
  }
  return <div className="page">
    <Header title="Plot" parent="Connections" hideArena />
    {error ? <p className="notice error" role="alert">{error}</p> : complete ? <div className="notice">
      <h2>You’re ready for Connections at Plot</h2>
      <p>Your profile is set up. More event details will appear here soon.</p>
      <p>This doesn’t RSVP you for the event. Your RSVP happens on Plot.</p>
    </div> : <>
      <p className="muted">Meet in person for friendship, romance, or collaboration. Create a short profile to get started.</p>
      <ProfileForm person={session.person} demo={false} plot />
    </>}
  </div>;
}
