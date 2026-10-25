import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PlotOverviewPairs } from "@/components/plot-overview-pairs";
export const dynamic = "force-dynamic";
const names = ["Maya Chen", "Alex Lee", "Sam Rivera", "Nora Ellis", "Eli Park", "Lou Martin", "Avery Johnson", "Jordan Williams", "Casey Thompson", "Riley Anderson", "Morgan Patel", "Taylor Nguyen", "Jamie Rodriguez", "Robin Kim", "Drew Wilson", "Cameron Brooks", "Sasha Bennett", "Quinn Davis", "Jules Martinez", "Rowan Clarke"];
export default async function PlotOverviewSandbox() {
  if (process.env.NODE_ENV !== "development") notFound();
  const host = (await headers()).get("host") || "";
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) notFound();
  const pairs = Array.from({ length: 20 }, (_, index) => ({ pair_number: index + 1, first: { name: names[(index * 2) % names.length] }, second: { name: names[(index * 2 + 1) % names.length] } }));
  return <div className="page plot-overview-page"><section className="plot-overview-pairs" aria-label="Example pairings"><PlotOverviewPairs pairs={pairs} /></section></div>;
}
