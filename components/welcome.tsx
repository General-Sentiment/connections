import { Suspense, cache } from "react";
import { getSession } from "@/lib/session";
import { aboutBlockId } from "@/lib/config";
import { WelcomeAction } from "./welcome-action";

export const hasConnection = cache(async () => {
  const session = await getSession();
  return Boolean(session?.token && session.person);
});

export function Welcome() {
  const aboutId = aboutBlockId();
  return <section className="welcome-screen" aria-labelledby="welcome-title">
    <div className="welcome-content">
      <svg className="connections-mark welcome-mark" viewBox="0 0 54 36" fill="none" aria-hidden="true"><circle cx="17" cy="18" r="14" /><circle cx="37" cy="18" r="14" /></svg>
      <h1 id="welcome-title">Connections</h1>
      <p>Meet people through what they collect and create on Are.na. Find conversation, friendship, creative partners, romance, or just someone new to meet.</p>
      <Suspense><WelcomeAction /></Suspense>
      {aboutId && <a className="button welcome-learn-more" href={`https://www.are.na/block/${aboutId}`} target="_blank" rel="noopener noreferrer">Learn more</a>}
    </div>
  </section>;
}
