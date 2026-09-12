"use client";
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import Link from "./app-link";
import { Header } from "./header";
import { Conversation } from "./conversation";
import type { Person, Message } from "@/lib/types";
const responseImages = [
  "https://images.are.na/eyJidWNrZXQiOiJhcmVuYV9pbWFnZXMiLCJrZXkiOiI0NzMxMjc2Ny9vcmlnaW5hbF9lNmRjZjA4YTdiZThiYWNkMzM0MWI0NDE1YjA3NjUyNy5qcGVnIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo2MDAsImhlaWdodCI6NjAwLCJmaXQiOiJpbnNpZGUiLCJ3aXRob3V0RW5sYXJnZW1lbnQiOnRydWV9LCJ3ZWJwIjp7InF1YWxpdHkiOjc1fSwiZmxhdHRlbiI6eyJiYWNrZ3JvdW5kIjp7InIiOjIwMywiZyI6MjAzLCJiIjoyMDN9fSwianBlZyI6eyJxdWFsaXR5Ijo3NX0sInJvdGF0ZSI6bnVsbH19",
  "https://images.are.na/eyJidWNrZXQiOiJhcmVuYV9pbWFnZXMiLCJrZXkiOiIxNTI4MDQxOS9vcmlnaW5hbF9kOTBmNDNiMzFiYmM0ZTg4ZWUwODY0YjM1MGE2M2RmMC5qcGciLCJlZGl0cyI6eyJyZXNpemUiOnsid2lkdGgiOjYwMCwiaGVpZ2h0Ijo2MDAsImZpdCI6Imluc2lkZSIsIndpdGhvdXRFbmxhcmdlbWVudCI6dHJ1ZX0sIndlYnAiOnsicXVhbGl0eSI6NzV9LCJmbGF0dGVuIjp7ImJhY2tncm91bmQiOnsiciI6MjAzLCJnIjoyMDMsImIiOjIwM319LCJqcGVnIjp7InF1YWxpdHkiOjc1fSwicm90YXRlIjpudWxsfX0=",
  "https://images.are.na/eyJidWNrZXQiOiJhcmVuYV9pbWFnZXMiLCJrZXkiOiIzNjk0OTc2Ny9vcmlnaW5hbF8yZTk4ZmM5NTMwYTU3ZDA3YzhiZmNiMTNhYTgxMDViYy5qcGciLCJlZGl0cyI6eyJyZXNpemUiOnsid2lkdGgiOjYwMCwiaGVpZ2h0Ijo2MDAsImZpdCI6Imluc2lkZSIsIndpdGhvdXRFbmxhcmdlbWVudCI6dHJ1ZX0sIndlYnAiOnsicXVhbGl0eSI6NzV9LCJmbGF0dGVuIjp7ImJhY2tncm91bmQiOnsiciI6MjAzLCJnIjoyMDMsImIiOjIwM319LCJqcGVnIjp7InF1YWxpdHkiOjc1fSwicm90YXRlIjpudWxsfX0=",
  "https://images.are.na/eyJidWNrZXQiOiJhcmVuYV9pbWFnZXMiLCJrZXkiOiIyNTI1ODEzNC9vcmlnaW5hbF83ZDdiZDYzYTkwOTVlZjM3ZWYwMGRjZTA4MDhiMzA4NS5qcGciLCJlZGl0cyI6eyJyZXNpemUiOnsid2lkdGgiOjYwMCwiaGVpZ2h0Ijo2MDAsImZpdCI6Imluc2lkZSIsIndpdGhvdXRFbmxhcmdlbWVudCI6dHJ1ZX0sIndlYnAiOnsicXVhbGl0eSI6NzV9LCJmbGF0dGVuIjp7ImJhY2tncm91bmQiOnsiciI6MjAzLCJnIjoyMDMsImIiOjIwM319LCJqcGVnIjp7InF1YWxpdHkiOjc1fSwicm90YXRlIjpudWxsfX0=",
  "https://images.are.na/eyJidWNrZXQiOiJhcmVuYV9pbWFnZXMiLCJrZXkiOiIzOTc2MzgwOC9vcmlnaW5hbF80NTNmZGNkN2RiZDE5Y2VlMGM4M2Q1ODIyNmExZjdmYi5wbmciLCJlZGl0cyI6eyJyZXNpemUiOnsid2lkdGgiOjYwMCwiaGVpZ2h0Ijo2MDAsImZpdCI6Imluc2lkZSIsIndpdGhvdXRFbmxhcmdlbWVudCI6dHJ1ZX0sIndlYnAiOnsicXVhbGl0eSI6NzV9LCJmbGF0dGVuIjp7ImJhY2tncm91bmQiOnsiciI6MjAzLCJnIjoyMDMsImIiOjIwM319LCJqcGVnIjp7InF1YWxpdHkiOjc1fSwicm90YXRlIjpudWxsfX0=",
  "https://images.are.na/eyJidWNrZXQiOiJhcmVuYV9pbWFnZXMiLCJrZXkiOiIzOTc4MDA5MS9vcmlnaW5hbF82YWQwMTUzNTA4YWVlNWVmMDBmMjlkYTY1OTI3ZWQ4OC5wbmciLCJlZGl0cyI6eyJyZXNpemUiOnsid2lkdGgiOjYwMCwiaGVpZ2h0Ijo2MDAsImZpdCI6Imluc2lkZSIsIndpdGhvdXRFbmxhcmdlbWVudCI6dHJ1ZX0sIndlYnAiOnsicXVhbGl0eSI6NzV9LCJmbGF0dGVuIjp7ImJhY2tncm91bmQiOnsiciI6MjAzLCJnIjoyMDMsImIiOjIwM319LCJqcGVnIjp7InF1YWxpdHkiOjc1fSwicm90YXRlIjpudWxsfX0=",
  "https://images.are.na/eyJidWNrZXQiOiJhcmVuYV9pbWFnZXMiLCJrZXkiOiIzMDg4MjY1MC9vcmlnaW5hbF81NjRmMzBiOGYwNzI5YjU5ZGEzNzBhZDJmMDVmMmZjNS53ZWJwIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo2MDAsImhlaWdodCI6NjAwLCJmaXQiOiJpbnNpZGUiLCJ3aXRob3V0RW5sYXJnZW1lbnQiOnRydWV9LCJ3ZWJwIjp7InF1YWxpdHkiOjc1fSwiZmxhdHRlbiI6eyJiYWNrZ3JvdW5kIjp7InIiOjIwMywiZyI6MjAzLCJiIjoyMDN9fSwianBlZyI6eyJxdWFsaXR5Ijo3NX0sInJvdGF0ZSI6bnVsbH19",
  "https://images.are.na/eyJidWNrZXQiOiJhcmVuYV9pbWFnZXMiLCJrZXkiOiIzNDU5OTU3Ni9vcmlnaW5hbF8zMzZjYmJkMzA2MTE2ZmZlODg5ODRlZWZhMzdhYjcyZS5wbmciLCJlZGl0cyI6eyJyZXNpemUiOnsid2lkdGgiOjYwMCwiaGVpZ2h0Ijo2MDAsImZpdCI6Imluc2lkZSIsIndpdGhvdXRFbmxhcmdlbWVudCI6dHJ1ZX0sIndlYnAiOnsicXVhbGl0eSI6NzV9LCJmbGF0dGVuIjp7ImJhY2tncm91bmQiOnsiciI6MjAzLCJnIjoyMDMsImIiOjIwM319LCJqcGVnIjp7InF1YWxpdHkiOjc1fSwicm90YXRlIjpudWxsfX0=",
  "https://images.are.na/eyJidWNrZXQiOiJhcmVuYV9pbWFnZXMiLCJrZXkiOiIxNTU5OTQ4Mi9vcmlnaW5hbF8wZDM4MDRmNjcyYzY3MmM5NDU0N2E2MDk2MTAzMzY2ZS5qcGciLCJlZGl0cyI6eyJyZXNpemUiOnsid2lkdGgiOjYwMCwiaGVpZ2h0Ijo2MDAsImZpdCI6Imluc2lkZSIsIndpdGhvdXRFbmxhcmdlbWVudCI6dHJ1ZX0sIndlYnAiOnsicXVhbGl0eSI6NzV9LCJmbGF0dGVuIjp7ImJhY2tncm91bmQiOnsiciI6MjAzLCJnIjoyMDMsImIiOjIwM319LCJqcGVnIjp7InF1YWxpdHkiOjc1fSwicm90YXRlIjpudWxsfX0=",
  "https://images.are.na/eyJidWNrZXQiOiJhcmVuYV9pbWFnZXMiLCJrZXkiOiI0NTM3MDkxOC9vcmlnaW5hbF8xMzNkNzZkNjY2ZTI5OTMyNjY2NmQyOTI4YzU2YzA1Zi5qcGciLCJlZGl0cyI6eyJyZXNpemUiOnsid2lkdGgiOjYwMCwiaGVpZ2h0Ijo2MDAsImZpdCI6Imluc2lkZSIsIndpdGhvdXRFbmxhcmdlbWVudCI6dHJ1ZX0sIndlYnAiOnsicXVhbGl0eSI6NzV9LCJmbGF0dGVuIjp7ImJhY2tncm91bmQiOnsiciI6MjAzLCJnIjoyMDMsImIiOjIwM319LCJqcGVnIjp7InF1YWxpdHkiOjc1fSwicm90YXRlIjpudWxsfX0="
];
const sampleChannelTitles = ["Quiet corners", "Notes in the margins", "Everyday colors", "Shared gardens", "Listening closely", "Things made by hand"];
const profileNames = ["Riley Chen", "Alex Lee", "Sam Rivera", "Quinn Ellis", "Jamie Park", "Robin Silva"];
const profileLocations = ["Los Angeles, United States", "London, United Kingdom", "Mexico City, Mexico", "Berlin, Germany", "Seoul, South Korea", "Lisbon, Portugal"];
const connectionNames = ["Taylor Reed", "Jordan Blake", "Morgan Hayes", "Avery Brooks"];
const dummyPhotos = [
  "https://images.are.na/eyJidWNrZXQiOiJhcmVuYV9pbWFnZXMiLCJrZXkiOiIzNTg0NzQ1OC9vcmlnaW5hbF9kNWE0M2MxMzM0YzFhY2I5MWJjOWFlODQyNTgwZWFmNC5qcGciLCJlZGl0cyI6eyJyZXNpemUiOnsid2lkdGgiOjYwMCwiaGVpZ2h0Ijo2MDAsImZpdCI6Imluc2lkZSIsIndpdGhvdXRFbmxhcmdlbWVudCI6dHJ1ZX0sIndlYnAiOnsicXVhbGl0eSI6NzV9LCJmbGF0dGVuIjp7ImJhY2tncm91bmQiOnsiciI6MjAzLCJnIjoyMDMsImIiOjIwM319LCJqcGVnIjp7InF1YWxpdHkiOjc1fSwicm90YXRlIjpudWxsfX0=",
  "https://static.avatars.are.na/755871/original_8647f3e29223bbd53a8a8b9c95c30445.png?1769530104",
  "https://images.are.na/eyJidWNrZXQiOiJhcmVuYV9pbWFnZXMiLCJrZXkiOiI4OTcxMjE1L29yaWdpbmFsXzkwMzQxMDRhNzEwZmFmNWQxNDY2YjlhOThhZWFiODBlLnBuZyIsImVkaXRzIjp7InJlc2l6ZSI6eyJ3aWR0aCI6NjAwLCJoZWlnaHQiOjYwMCwiZml0IjoiaW5zaWRlIiwid2l0aG91dEVubGFyZ2VtZW50Ijp0cnVlfSwid2VicCI6eyJxdWFsaXR5Ijo3NX0sImZsYXR0ZW4iOnsiYmFja2dyb3VuZCI6eyJyIjoyMDMsImciOjIwMywiYiI6MjAzfX0sImpwZWciOnsicXVhbGl0eSI6NzV9LCJyb3RhdGUiOm51bGx9fQ==",
  "https://images.are.na/eyJidWNrZXQiOiJhcmVuYV9pbWFnZXMiLCJrZXkiOiIxNzg5Nzg3NC9vcmlnaW5hbF9hYjUyYjM1N2UzMzQ1Y2VhMjgzMTU4MGU1M2M0NDBiMC5qcGciLCJlZGl0cyI6eyJyZXNpemUiOnsid2lkdGgiOjYwMCwiaGVpZ2h0Ijo2MDAsImZpdCI6Imluc2lkZSIsIndpdGhvdXRFbmxhcmdlbWVudCI6dHJ1ZX0sIndlYnAiOnsicXVhbGl0eSI6NzV9LCJmbGF0dGVuIjp7ImJhY2tncm91bmQiOnsiciI6MjAzLCJnIjoyMDMsImIiOjIwM319LCJqcGVnIjp7InF1YWxpdHkiOjc1fSwicm90YXRlIjpudWxsfX0=",
  "https://images.are.na/eyJidWNrZXQiOiJhcmVuYV9pbWFnZXMiLCJrZXkiOiIxMDAwODg4My9vcmlnaW5hbF8yMDkyYWQzYjE4MDYyMDczZWMwYTYxMmU3YjQ2NTBlZi5qcGciLCJlZGl0cyI6eyJyZXNpemUiOnsid2lkdGgiOjYwMCwiaGVpZ2h0Ijo2MDAsImZpdCI6Imluc2lkZSIsIndpdGhvdXRFbmxhcmdlbWVudCI6dHJ1ZX0sIndlYnAiOnsicXVhbGl0eSI6NzV9LCJmbGF0dGVuIjp7ImJhY2tncm91bmQiOnsiciI6MjAzLCJnIjoyMDMsImIiOjIwM319LCJqcGVnIjp7InF1YWxpdHkiOjc1fSwicm90YXRlIjpudWxsfX0=",
  "https://images.are.na/eyJidWNrZXQiOiJhcmVuYV9pbWFnZXMiLCJrZXkiOiIxNTQxMzA0L29yaWdpbmFsX2QxNGNkZmEzN2VhNzA4YjhhM2YyMTRjMzgyZTQwODQ1LmpwZyIsImVkaXRzIjp7InJlc2l6ZSI6eyJ3aWR0aCI6NjAwLCJoZWlnaHQiOjYwMCwiZml0IjoiaW5zaWRlIiwid2l0aG91dEVubGFyZ2VtZW50Ijp0cnVlfSwid2VicCI6eyJxdWFsaXR5Ijo3NX0sImZsYXR0ZW4iOnsiYmFja2dyb3VuZCI6eyJyIjoyMDMsImciOjIwMywiYiI6MjAzfX0sImpwZWciOnsicXVhbGl0eSI6NzV9LCJyb3RhdGUiOm51bGx9fQ==",
  "https://images.are.na/eyJidWNrZXQiOiJhcmVuYV9pbWFnZXMiLCJrZXkiOiIxMTAzNjQyNC9vcmlnaW5hbF8yZTUyNjMzY2Q3Y2I1OTJjZTcyNGNlYjUxNzI4ZjEyZi5qcGciLCJlZGl0cyI6eyJyZXNpemUiOnsid2lkdGgiOjYwMCwiaGVpZ2h0Ijo2MDAsImZpdCI6Imluc2lkZSIsIndpdGhvdXRFbmxhcmdlbWVudCI6dHJ1ZX0sIndlYnAiOnsicXVhbGl0eSI6NzV9LCJmbGF0dGVuIjp7ImJhY2tncm91bmQiOnsiciI6MjAzLCJnIjoyMDMsImIiOjIwM319LCJqcGVnIjp7InF1YWxpdHkiOjc1fSwicm90YXRlIjpudWxsfX0="
];
const fakeDataStorageKey = "connections:fake-data";
const Debug = createContext({ enabled: false, toggle: (_value: boolean) => {} });
export function DevDebugProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    try { setEnabled(localStorage.getItem(fakeDataStorageKey) === "true"); } catch { /* Storage may be unavailable. */ }
  }, []);
  function toggle(value: boolean) {
    setEnabled(value);
    try { localStorage.setItem(fakeDataStorageKey, String(value)); } catch { /* Keep the toggle usable without storage. */ }
  }
  return <Debug.Provider value={{ enabled, toggle }}>{children}</Debug.Provider>;
}
const subscribeToHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function useDevDebug() {
  const { enabled, toggle } = useContext(Debug);
  // Suspense children can hydrate after the provider has already mounted.
  const hydrated = useSyncExternalStore(subscribeToHydration, clientSnapshot, serverSnapshot);
  const available = hydrated;
  return { enabled: available && enabled, toggle, available };
}
export function DevDummyItems({ matches = false, view = "grid" }: { matches?: boolean; view?: string }) {
  const { enabled } = useDevDebug();
  if (!enabled) return null;
  const names = matches
    ? connectionNames
    : profileNames;
  return <>{names.map((name, index) => matches ? (
    <Link key={name} href={`/connections/sample-${index + 1}`} className={view === "table" ? "connection-table-row" : "card-square channel-tile private"}><div><div className="channel-title">You &amp; {name}</div><p>{index + 1} messages</p></div></Link>
  ) : view === "table" ? (
    <article className={matches ? "connection-table-row" : "profile-table-row"} key={name}>
      <div className="table-introduction"><h2><Link href={`/people/sample-${index + 1}`}>{name}</Link></h2></div>
      <span className="muted">{matches ? `${index + 1} messages` : ["Los Angeles, United States", "London, United Kingdom", "Mexico City, Mexico", "Berlin, Germany", "Seoul, South Korea", "Lisbon, Portugal"][index]}</span>
      {!matches && <div className="table-photo"><img src={dummyPhotos[index]} alt="" loading="lazy" /></div>}
    </article>
  ) : (
    <article className="card" key={name}><Link href={`/people/sample-${index + 1}`} className="profile-card">
      {matches ? <div><div className="channel-title">You &amp; {name}</div><p>{index + 1} messages</p></div> : <><h2>{name}</h2><img src={dummyPhotos[index]} alt="" loading="lazy" /></>}
    </Link></article>
  ))}</>;
}

export function DevListing({ children, matches = false, view = "grid" }: { children: React.ReactNode; matches?: boolean; view?: string }) {
  const { enabled } = useDevDebug();
  if (!enabled) return <>{children}</>;
  return <div className={view === "table" ? (matches ? "connection-table" : "profile-table") : "grid"}><DevDummyItems matches={matches} view={view} /></div>;
}

export function DevConversation({ index }: { index: number }) {
  const { available } = useDevDebug();
  if (!available) return null;
  const name = connectionNames[index];
  const self: Person = { id: 990000, type: "User", name: "You", slug: "sample-you" };
  const recipient: Person = { id: 990001 + index, type: "User", name, slug: `sample-${index + 1}` };
  const texts = [
    ["Hi! I loved your collection of small reading spaces. Do you have a favorite spot?"],
    ["I've been working on a little photo zine. Would you like to swap references?", "Absolutely. I've been collecting some interesting print layouts lately."],
    ["Have you seen any good films lately?", "I went to a screening of a short documentary about public gardens.", "That sounds great. I'd love to hear more about it."],
    ["Your collection of everyday objects caught my eye.", "Thanks! I started it as a way to pay more attention on walks.", "I do something similar with signs and lettering.", "We should take a walk and compare what we notice."]
  ][index];
  const messages: Message[] = texts.map((text, i) => ({
    id: `sample-${index}-${i}`, sender: i % 2 ? self : recipient,
    sentAt: `2026-09-09T10:${42 + i}:00Z`, text, attachments: []
  }));
  return <div className="page chat-page"><Header parent="Connections" back="/connections" title={`You & ${name}`} /><Conversation key={index} self={self} recipient={recipient} initialMessages={messages} demo /></div>;
}

export function AccountConnectionCount({ realCount }: { realCount: number | null }) {
  const { enabled } = useDevDebug();
  const count = enabled ? connectionNames.length : realCount;
  return <Link href="/connections" className="button account-count" aria-label={count === null ? "View connections" : `${count} connections`}>{count ?? "—"}</Link>;
}

export function DevProfile({ index }: { index: number }) {
  const name = profileNames[index];
  const biographies = [
    "A designer who collects small details from long walks around Los Angeles.",
    "A reader, occasional writer, and enthusiastic visitor to independent cinemas.",
    "I make photographs and small publications about everyday life in Mexico City.",
    "An illustrator interested in public spaces, gardens, and how people spend time together.",
    "I work with sound and keep a notebook of things I overhear on the train.",
    "A ceramicist collecting textures, recipes, and reasons to take the scenic route."
  ];
  const answers = [
    ["A quiet place to sit and watch the city wake up.", "Taking photographs without knowing what I'll do with them.", "A walk with no particular destination."],
    ["A book with notes left by its previous reader.", "Going to the cinema on a rainy afternoon.", "The last good thing you read."],
    ["A handmade publication passed between friends.", "Looking for unexpected colors in ordinary streets.", "Let's exchange a few photographs."],
    ["A community garden in the middle of the city.", "Drawing the same place at different times of day.", "Somewhere outdoors with room to talk."],
    ["A recording of a place that no longer exists.", "Listening to an album from beginning to end.", "A song you keep coming back to."],
    ["A cup that fits perfectly in your hands.", "Learning a recipe from someone else.", "A shared meal and an unhurried conversation."]
  ][index];
  return <div className="page"><Header parent="Profiles" back="/" title={name} />
    <div className="profile-introduction">
      <div className="profile-content-photo"><img src={dummyPhotos[index]} alt={name} /></div>
      <dl className="rows profile-attributes"><div><dt>Location</dt><dd>{profileLocations[index]}</dd></div><div><dt>Open to</dt><dd>Conversation, Friendship, Creative partnership</dd></div><div><dt>Meeting preference</dt><dd>Open to anywhere</dd></div></dl>
      <section className="profile-introduction-text"><h2 className="info-title">Who are you?</h2><p className="preview-text">{biographies[index]}</p></section>
      <section className="profile-introduction-text"><h2 className="info-title">Looking for</h2><p className="preview-text">People to exchange references with, share ideas, and make small things together.</p></section>
    </div>
    <div className="featured-profile-items">{answers.map((answer, i) => <section key={answer}><p className="profile-selection-prompt">{["What is something you treasure?", "What will you never be too old to enjoy?", "Where should we begin?"][i]}</p>{i === 1 ? <div className="card-square channel-tile public"><div className="channel-inner"><div className="channel-title">{sampleChannelTitles[index]}</div><div className="channel-meta"><strong>by {name}</strong><br />{8 + index * 3} blocks</div></div></div> : i === 0 ? <div className="card-square"><img src={responseImages[index]} alt="" loading="lazy" /></div> : <div className="card-square text-block"><div className="text-tile">{answer}</div></div>}{i < 2 && <p className="featured-description">{answer}</p>}</section>)}</div>
  </div>;
}
