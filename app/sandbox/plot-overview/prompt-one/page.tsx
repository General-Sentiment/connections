import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PlotAnswerSlideshow } from "@/components/plot-answer-slideshow";
import { readPlotPrompt } from "@/lib/plot-pairings";
import { demoBlocks, demoPeople } from "@/lib/demo";
export const dynamic = "force-dynamic";
export default async function PromptOneOverviewSandbox() {
  if (process.env.NODE_ENV !== "development") notFound();
  const host = (await headers()).get("host") || "";
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) notFound();
  const prompt = await readPlotPrompt("one").catch(() => ({ text: "What is something you keep coming back to?" }));
  const answers = demoBlocks.slice(0, 5).map((item, index) => ({ item, author: demoPeople[index % demoPeople.length].name }));
  return <div className="page plot-overview-page"><PlotAnswerSlideshow prompt={prompt.text} answers={answers} /></div>;
}
