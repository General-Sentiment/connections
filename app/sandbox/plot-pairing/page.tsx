import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { PlotPairing, type Pairing } from "@/components/plot-pairing";
import { demoProfiles, demoBlocks } from "@/lib/demo";
export const dynamic = "force-dynamic";
export default async function PairingSandbox() {
  if (process.env.NODE_ENV !== "development") notFound();
  const host = (await headers()).get("host") || "";
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) notFound();
  const partner = demoProfiles[1];
  const preview: Pairing = { runId: 1, partners: [{ user_id: partner.person.id, profile_id: partner.channel.id, name: partner.person.name, pairNumber: 12, shared: ["conversation", "friendship"], answers: [
    { item: demoBlocks[0], prompt: { id: 1, text: "What is something you keep coming back to?" }, description: "I’m drawn to ordinary things that reveal something new each time you look." },
    { item: demoBlocks[1], prompt: { id: 2, text: "What would you like to share with someone?" }, description: "A place to start a conversation, exchange references, and make something together." },
  ] }] };
  return <div className="page plot-page"><Header title="Plot" parent="Connections" hideArena /><PlotPairing mode="pairing" preview={preview} /></div>;
}
