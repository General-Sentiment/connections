import { Suspense, cache } from "react";
import { getSession } from "@/lib/session";
import { WelcomeAction } from "./welcome-action";

export const hasConnection = cache(async () => {
  const session = await getSession();
  return Boolean(session?.token && session.person);
});

export function Welcome() {
  return <section className="welcome-screen" aria-labelledby="welcome-title">
    <div className="welcome-content">
      <h1 id="welcome-title">Connections</h1>
      <p>Meet people through what they collect and create on Are.na. Find conversation, friendship, creative partners, romance, or just someone new to meet.</p>
      <Suspense><WelcomeAction /></Suspense>
    </div>
  </section>;
}
