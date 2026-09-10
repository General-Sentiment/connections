"use client";
import { useOptimistic, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { intentions } from "@/lib/details";
const options = [["all", "All"], ...intentions] as const;
export function DirectoryFilter({ value }: { value: string }) {
  const pathname = usePathname(); const router = useRouter(); const params = useSearchParams();
  const [active, setActive] = useOptimistic(value);
  const [pending, startTransition] = useTransition();
  return <div className="view-options" role="group" aria-label="Filter by open to" aria-busy={pending}>
    <span className="view-indicator" aria-hidden style={{ transform: `translateY(${Math.max(0, options.findIndex(([key]) => key === active)) * 18}px)` }} />
    {options.map(([key, label]) => <button type="button" key={key} aria-pressed={active === key} onClick={() => startTransition(() => {
      setActive(key); const query = new URLSearchParams(params.toString());
      if (key === "all") query.delete("open_to"); else query.set("open_to", key);
      query.delete("page"); router.push(`${pathname}?${query}`, { scroll: false });
    })}>{label}</button>)}
  </div>;
}
