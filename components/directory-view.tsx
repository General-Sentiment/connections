"use client";
import { useOptimistic, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
export function DirectoryView({ view }: { view: "grid" | "table" }) {
  const router = useRouter(); const params = useSearchParams();
  const [active, setActive] = useOptimistic(view); const [pending, startTransition] = useTransition();
  return <div className="view-options" role="group" aria-label="Directory view" aria-busy={pending}>
    <span className="view-indicator" aria-hidden style={{ transform: `translateY(${active === "table" ? 18 : 0}px)` }} />
    {(["grid", "table"] as const).map(value => <button key={value} type="button" aria-pressed={active === value} onClick={() => startTransition(() => { setActive(value); const query = new URLSearchParams(params.toString()); query.set("view", value); router.push(`/?${query}`, { scroll: false }); })}>{value === "grid" ? "Grid" : "Table"}</button>)}
  </div>;
}
