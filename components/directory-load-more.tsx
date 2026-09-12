"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function DirectoryLoadMore({ href }: { href: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return <div className="footer-actions directory-pagination">
    <button type="button" disabled={pending} aria-busy={pending} onClick={() => startTransition(() => {
      router.replace(href, { scroll: false });
    })}>{pending ? "Loading…" : "Load more"}</button>
  </div>;
}
