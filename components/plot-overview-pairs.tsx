"use client";
import { useLayoutEffect, useRef } from "react";
type Pair = { pair_number?: number; first: { name: string }; second: { name: string } };
export function PlotOverviewPairs({ pairs }: { pairs: Pair[] }) {
  const container = useRef<HTMLDivElement>(null);
  const table = useRef<HTMLTableElement>(null);
  useLayoutEffect(() => {
    const fit = () => {
      if (!container.current || !table.current) return;
      const viewport = container.current.closest(".window-viewport");
      const bottom = Math.min(window.innerHeight, viewport?.getBoundingClientRect().bottom ?? window.innerHeight);
      const available = Math.max(1, bottom - container.current.getBoundingClientRect().top - 24);
      let low = 1; let high = 36;
      for (let attempt = 0; attempt < 12; attempt++) {
        const size = (low + high) / 2;
        table.current.style.fontSize = `${size}px`;
        const cellsFit = Array.from(table.current.querySelectorAll("th,td")).every(cell => cell.scrollWidth <= cell.clientWidth + 1);
        if (table.current.getBoundingClientRect().height <= available && cellsFit) low = size;
        else high = size;
      }
      table.current.style.fontSize = `${low}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    if (container.current) observer.observe(container.current);
    const viewport = container.current?.closest(".window-viewport");
    if (viewport) observer.observe(viewport);
    const timers = [100, 300, 700, 1500].map(delay => setTimeout(fit, delay));
    window.addEventListener("resize", fit);
    return () => { timers.forEach(clearTimeout); observer.disconnect(); window.removeEventListener("resize", fit); };
  }, [pairs]);
  return <div ref={container} className="plot-overview-pair-table"><table ref={table} className="pairing-table"><thead><tr><th scope="col">Pair</th><th scope="col">Person 1</th><th scope="col">Person 2</th></tr></thead><tbody>{pairs.map((pair, index) => <tr key={index}><td>{pair.pair_number ?? index + 1}</td><td>{pair.first.name}</td><td>{pair.second.name}</td></tr>)}</tbody></table></div>;
}
