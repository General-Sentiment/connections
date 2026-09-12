"use client";

import { useEffect, useRef } from "react";

export function useLeaveConfirmation(active: boolean) {
  const bypass = useRef(false);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const message = "Are you sure you want to leave? You have an unfinished profile.";
    const confirm = () => !activeRef.current || bypass.current || window.confirm(message);
    const unload = (event: BeforeUnloadEvent) => {
      if (!activeRef.current || bypass.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, location.href);
      if (url.pathname === location.pathname && url.search === location.search && url.origin === location.origin) return;
      if (!confirm()) { event.preventDefault(); event.stopImmediatePropagation(); }
      else if (activeRef.current) bypass.current = true;
    };
    // The Navigation API also covers browser Back/Forward and programmatic routing.
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    const navigate = (event: Event) => {
      const e = event as Event & { destination: { url: string }; navigationType: string };
      const url = new URL(e.destination.url);
      if (!e.cancelable || e.navigationType === "reload" || (url.pathname === location.pathname && url.search === location.search)) return;
      if (!confirm()) e.preventDefault();
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    navigation?.addEventListener("navigate", navigate);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
      navigation?.removeEventListener("navigate", navigate);
    };
  }, []);
  return bypass;
}
