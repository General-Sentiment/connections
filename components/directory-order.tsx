"use client";

import { useOptimistic, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const options = [["newest", "Newest"], ["updated", "Updated recently"], ["random", "Random"]] as const;
type Order = typeof options[number][0];

export function DirectoryOrder({ order, seed }: { order: Order; seed: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const [active, setActive] = useOptimistic(order);
  const [pending, startTransition] = useTransition();

  return <div className="view-options" role="group" aria-label="Profile order" aria-busy={pending}>
    <span className="view-indicator" aria-hidden style={{ transform: `translateY(${options.findIndex(([value]) => value === active) * 18}px)` }} />
    {options.map(([value, label]) => <button key={value} type="button" aria-pressed={active === value} onClick={() => startTransition(() => {
      setActive(value);
      const query = new URLSearchParams(params.toString());
      query.set("order", value);
      query.delete("page");
      if (value === "random") query.set("seed", String(seed));
      else query.delete("seed");
      router.push(`${pathname}?${query}`, { scroll: false });
    })}>{label}</button>)}
  </div>;
}
