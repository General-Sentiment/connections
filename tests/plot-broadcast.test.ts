import { afterEach, expect, it, vi } from "vitest";
import { broadcastPlotUpdate, subscribePlotUpdates } from "../lib/plot-broadcast";
afterEach(() => vi.unstubAllGlobals());
it("notifies locally and broadcasts only a versioned update signal", () => {
  vi.stubGlobal("window", new EventTarget());
  const postMessage = vi.fn(); const close = vi.fn();
  vi.stubGlobal("BroadcastChannel", class { postMessage = postMessage; close = close; });
  const listener = vi.fn(); const unsubscribe = subscribePlotUpdates(listener);
  broadcastPlotUpdate();
  expect(listener).toHaveBeenCalledTimes(1);
  expect(postMessage).toHaveBeenCalledWith({ type: "plot.updated", version: 1, senderId: expect.any(String) });
  unsubscribe(); broadcastPlotUpdate();
  expect(listener).toHaveBeenCalledTimes(1);
  expect(close).toHaveBeenCalled();
});
it("works without BroadcastChannel using local events", () => {
  vi.stubGlobal("window", new EventTarget()); vi.stubGlobal("BroadcastChannel", undefined);
  const listener = vi.fn(); const unsubscribe = subscribePlotUpdates(listener);
  broadcastPlotUpdate(); expect(listener).toHaveBeenCalledTimes(1); unsubscribe();
});
