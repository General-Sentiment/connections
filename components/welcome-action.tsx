"use client";
import { usePathname, useSearchParams } from "next/navigation";

export function WelcomeAction() {
  const pathname = usePathname();
  const params = useSearchParams();
  const query = new URLSearchParams(params.toString());
  const error = query.get("error");
  query.delete("error");
  const next = `${pathname}${query.size ? `?${query}` : ""}`;
  return <>
    {error && <p className="welcome-error" role="alert">{error}</p>}
    <a className="button" href={`/api/auth/login?next=${encodeURIComponent(next)}`}>Connect with Are.na</a>
  </>;
}
