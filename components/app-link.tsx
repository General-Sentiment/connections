"use client";

import NextLink, { useLinkStatus } from "next/link";
import type { ComponentProps, MouseEvent } from "react";

function skipIntroForNewTab(event: MouseEvent<HTMLAnchorElement>) {
  if (event.defaultPrevented || !(event.shiftKey || event.metaKey || event.ctrlKey || event.button === 1 || event.currentTarget.target === "_blank")) return;
  const anchor = event.currentTarget;
  const originalHref = anchor.getAttribute("href");
  const url = new URL(anchor.href);
  if (!originalHref || url.origin !== window.location.origin || anchor.hasAttribute("download")) return;
  url.searchParams.set("intro", "skip");
  const nextHref = `${url.pathname}${url.search}${url.hash}`;
  anchor.setAttribute("href", nextHref);
  // Let the browser follow the modified URL, then restore the source link.
  setTimeout(() => {
    if (anchor.getAttribute("href") === nextHref) anchor.setAttribute("href", originalHref);
  }, 0);
}

function NavigationStatus() {
  const { pending } = useLinkStatus();
  return <span hidden aria-busy={pending} />;
}

export default function Link({ children, onClick, onAuxClick, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink {...props} onClick={event => {
    onClick?.(event);
    skipIntroForNewTab(event);
  }} onAuxClick={event => {
    onAuxClick?.(event);
    if (event.button === 1) skipIntroForNewTab(event);
  }}>{children}<NavigationStatus /></NextLink>;
}
