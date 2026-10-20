import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { availableProfileRef } from "@/lib/profiles";
import { ArenaClient } from "@/lib/arena";
export const dynamic = "force-dynamic";
export default async function Onboarding() {
  const session = await getSession();
  if (!session?.person || !session.token) redirect("/api/auth/login?next=/onboarding");
  const profile = await availableProfileRef(session.person.id, new ArenaClient(session.token));
  redirect(profile?.published ? "/" : "/profile/edit");
}
