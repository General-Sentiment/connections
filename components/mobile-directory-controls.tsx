"use client";

import { useEffect, useId, useState } from "react";

export function MobileDirectoryControls({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [mobile, setMobile] = useState(false);
  const id = useId();
  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return <div className={`mobile-directory-controls${expanded ? " is-expanded" : ""}`}>
    <div id={id} className="directory-controls-content" inert={mobile && !expanded}>{children}</div>
    <button className="directory-controls-toggle" type="button" aria-expanded={expanded} aria-controls={id} aria-label={expanded ? "Collapse directory controls" : "Show all directory controls"} onClick={() => setExpanded(value => !value)}>
      <svg width="20" height="12" viewBox="0 0 20 12" fill="none" aria-hidden="true"><path d="m1 1 9 9 9-9" stroke="currentColor" strokeWidth="1.5" /></svg>
    </button>
  </div>;
}
