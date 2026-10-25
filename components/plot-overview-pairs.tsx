"use client";
import { useLayoutEffect, useRef } from "react";
type Pair = { pair_number?: number; first: { name: string }; second: { name: string } };
export function PlotOverviewPairs({ pairs }: { pairs: Pair[] }) {
  const container = useRef<HTMLDivElement>(null);
  const table = useRef<HTMLTableElement>(null);
  useLayoutEffect(() => {
    const fit = () => {
      if (!container.current || !table.current) return;
      if (container.current.getBoundingClientRect().width === 0) return;
      const viewport = container.current.closest(".window-viewport");
      const bottom = Math.min(window.innerHeight, viewport?.getBoundingClientRect().bottom ?? window.innerHeight);
      const available = Math.max(1, bottom - container.current.getBoundingClientRect().top - 24);
      const scale = container.current.getBoundingClientRect().width / Math.max(1, container.current.clientWidth);
      const rowCount = pairs.length + 1;
      const heightSize = Math.max(1, (available / Math.max(.1, scale) - rowCount) / (rowCount * 1.59));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      let widthSize = 32;
      if (context) {
        const cells = Array.from(table.current.querySelectorAll("th,td"));
        widthSize = Math.min(...cells.map(cell => {
          const computed = getComputedStyle(cell);
          context.font = `100px ${computed.fontFamily}`;
          const textWidth = context.measureText(cell.textContent || "").width / 100;
          return cell.clientWidth / (textWidth + .65);
        }));
      }
      const size = Math.max(1, Math.min(32, heightSize, widthSize) * .97);
      table.current.style.setProperty("--pair-font-size", `${size}px`);
    };
    fit();
    let stopped = false;
    let animationFrame = 0;
    let visibleFrames = 0;
    const settle = () => {
      if (stopped) return;
      if (container.current && container.current.getBoundingClientRect().width > 0) { fit(); visibleFrames++; }
      if (visibleFrames < 90) animationFrame = requestAnimationFrame(settle);
    };
    animationFrame = requestAnimationFrame(settle);
    void document.fonts.ready.then(() => { if (!stopped) fit(); });
    const observer = new ResizeObserver(fit);
    if (container.current) observer.observe(container.current);
    const viewport = container.current?.closest(".window-viewport");
    if (viewport) observer.observe(viewport);
    const timers = [100, 300, 700, 1500].map(delay => setTimeout(fit, delay));
    window.addEventListener("resize", fit);
    return () => { stopped = true; cancelAnimationFrame(animationFrame); timers.forEach(clearTimeout); observer.disconnect(); window.removeEventListener("resize", fit); };
  }, [pairs]);
  return <div ref={container} className="plot-overview-pair-table"><table ref={table} className="pairing-table"><thead><tr><th scope="col">Pair</th><th scope="col">Person 1</th><th scope="col">Person 2</th></tr></thead><tbody>{pairs.map((pair, index) => <tr key={index}><td>{pair.pair_number ?? index + 1}</td><td>{pair.first.name}</td><td>{pair.second.name}</td></tr>)}</tbody></table></div>;
}
