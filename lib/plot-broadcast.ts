const senderId = Math.random().toString(36).slice(2);
const channelName = "connections:plot-updates:v1";
const localEvent = "connections:plot-updated";
export function broadcastPlotUpdate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(localEvent));
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const channel = new BroadcastChannel(channelName);
    channel.postMessage({ type: "plot.updated", version: 1, senderId });
    channel.close();
  } catch { /* Polling remains available if browser messaging is blocked. */ }
}
export function subscribePlotUpdates(onUpdate: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(localEvent, onUpdate);
  let channel: BroadcastChannel | undefined;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(channelName);
      channel.onmessage = event => { if (event.data?.type === "plot.updated" && event.data?.version === 1 && event.data?.senderId !== senderId) onUpdate(); };
    }
  } catch { /* Polling remains available. */ }
  return () => { window.removeEventListener(localEvent, onUpdate); channel?.close(); };
}
