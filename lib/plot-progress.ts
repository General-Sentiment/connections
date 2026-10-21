const key = "connections:plot-pairing-progress";
const eventName = "plot-pairing-progress";
export type PlotProgress = { message: string; updatedAt: number } | null;
export function publishPlotProgress(message: string | null) {
  const value: PlotProgress = message === null ? null : { message, updatedAt: Date.now() };
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Progress is optional. */ }
  window.dispatchEvent(new Event(eventName));
}
export function subscribePlotProgress(callback: (value: PlotProgress) => void) {
  const read = () => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      callback(value && typeof value.message === "string" && typeof value.updatedAt === "number" && Date.now() - value.updatedAt < 30000 ? value : null);
    } catch { callback(null); }
  };
  const onStorage = (event: StorageEvent) => { if (event.key === key) read(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener(eventName, read);
  const timer = setInterval(read, 5000);
  read();
  return () => { clearInterval(timer); window.removeEventListener("storage", onStorage); window.removeEventListener(eventName, read); };
}
