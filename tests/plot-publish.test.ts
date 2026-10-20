import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ item: vi.fn(), allItems: vi.fn(), createBlock: vi.fn(), updateBlock: vi.fn(), load: vi.fn(), manager: vi.fn(), profileRef: vi.fn() }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("../lib/arena", async () => { const original = await vi.importActual<typeof import("../lib/arena")>("../lib/arena"); return { ...original, ArenaClient: class { item = mocks.item; } }; });
vi.mock("../lib/arena-discovery", () => ({ allItems: mocks.allItems }));
vi.mock("../lib/directory-auth", () => ({ directoryClient: mocks.manager }));
vi.mock("../lib/profiles", () => ({ availableProfileRef: mocks.profileRef, readProfile: vi.fn() }));
vi.mock("../lib/config", () => ({ groupId: () => 1 }));
vi.mock("../lib/match-profiles", () => ({ loadMatchProfiles: mocks.load }));
import { publishPlotRound, selectPlotRun, deletePlotRun, checkInToPlot, setPlotMode, plotYaml } from "../lib/plot-pairings";
import { demoProfiles } from "../lib/demo";
beforeEach(async () => {
  vi.clearAllMocks();
  mocks.profileRef.mockResolvedValue({ published: 1, channel_id: 321 });
  mocks.item.mockResolvedValue({ id: 100, visibility: "closed", can: { update: true } });
  mocks.manager.mockResolvedValue({ createBlock: mocks.createBlock, updateBlock: mocks.updateBlock });
  mocks.allItems.mockResolvedValue([{ id: 5, type: "Text", title: "state", content: { markdown: plotYaml({ schema: "plot_state", version: 1, active_run_id: 4, updated_at: "now" }) } }]);
  mocks.load.mockResolvedValue({ profiles: demoProfiles.slice(0, 2), skipped: 0 });
  const current = await mocks.allItems();
  mocks.allItems.mockResolvedValue([...current, ...demoProfiles.slice(0, 2).map(profile => ({ ...profile.channel, metadata: { app: "connections", published: true, profile_user_id: profile.person.id } }))]);
});
it("writes the complete run before switching state", async () => {
  mocks.createBlock.mockResolvedValue({ id: 123 });
  await publishPlotRound("token", 1, { romantic: false, romanticPreferences: true });
  expect(mocks.createBlock).toHaveBeenCalledTimes(1);
  expect(mocks.createBlock.mock.calls[0][3]).toBe("plot_pairings");
  expect(mocks.updateBlock.mock.calls[0][1].content).toContain("active_run_id: 123");
  expect(mocks.createBlock.mock.invocationCallOrder[0]).toBeLessThan(mocks.updateBlock.mock.invocationCallOrder[0]);
});
it("preserves the active state when run creation fails", async () => {
  mocks.createBlock.mockRejectedValue(new Error("Are.na unavailable"));
  await expect(publishPlotRound("token", 1, { romantic: false, romanticPreferences: true })).rejects.toThrow("Are.na unavailable");
  expect(mocks.updateBlock).not.toHaveBeenCalled();
});
it("rejects non-editors before accessing write credentials", async () => {
  mocks.item.mockResolvedValue({ can: { update: false } });
  await expect(publishPlotRound("token", 1, { romantic: false, romanticPreferences: true })).rejects.toMatchObject({ status: 403 });
  expect(mocks.manager).not.toHaveBeenCalled();
});

it("rejects selecting a block outside the event channel", async () => {
  await expect(selectPlotRun("token", 999)).rejects.toMatchObject({ status: 404 });
  expect(mocks.updateBlock).not.toHaveBeenCalled();
});
it("selects an existing validated run without creating another run", async () => {
  const state = { id: 5, type: "Text", title: "state", content: { markdown: plotYaml({ schema: "plot_state", version: 1, active_run_id: 4, updated_at: "now" }) } };
  const run = { id: 10, type: "Text", metadata: { role: "plot_pairings" }, content: { markdown: plotYaml({ schema: "plot_pairings", version: 1, created_at: "now", created_by: 1, settings: { romantic: false, romanticPreferences: true }, pairs: [], unpaired: [] }) } };
  mocks.allItems.mockResolvedValue([state, run]);
  await expect(selectPlotRun("token", 10)).resolves.toEqual({ activeRunId: 10 });
  expect(mocks.updateBlock.mock.calls[0][1].content).toContain("active_run_id: 10");
  expect(mocks.createBlock).not.toHaveBeenCalled();
});

it("publishes readable profiles while recording unavailable profiles", async () => {
  mocks.load.mockResolvedValue({ profiles: demoProfiles.slice(0, 2), skipped: 1 });
  mocks.createBlock.mockResolvedValue({ id: 123 });
  const result = await publishPlotRound("token", 1, { romantic: false, romanticPreferences: true });
  expect(result.skipped).toBe(1);
  expect(mocks.createBlock.mock.calls[0][2]).toContain("unavailable_profiles: 1");
  expect(mocks.updateBlock).toHaveBeenCalledTimes(1);
});

it("clears the pointer before deleting the active round", async () => {
  const disconnect = vi.fn();
  mocks.manager.mockResolvedValue({ updateBlock: mocks.updateBlock, disconnect });
  mocks.allItems.mockResolvedValue([{ id: 5, type: "Text", title: "state", content: { markdown: plotYaml({ schema: "plot_state", version: 1, active_run_id: 4, updated_at: "now" }) } }, { id: 4, type: "Text", metadata: { role: "plot_pairings" }, connection: { id: 44 } }]);
  await deletePlotRun("token", 4);
  expect(mocks.updateBlock.mock.calls[0][1].content).toContain("active_run_id: null");
  expect(mocks.updateBlock.mock.invocationCallOrder[0]).toBeLessThan(disconnect.mock.invocationCallOrder[0]);
});
it("removes only the selected run connection from the event channel", async () => {
  const disconnect = vi.fn().mockResolvedValue(undefined);
  mocks.manager.mockResolvedValue({ disconnect, createBlock: mocks.createBlock });
  mocks.allItems.mockResolvedValue([{ id: 10, type: "Text", metadata: { role: "plot_pairings" }, connection: { id: 99 }, content: { markdown: plotYaml({ schema: "plot_pairings", version: 1, created_at: "now", created_by: 1, settings: { romantic: false, romanticPreferences: true }, pairs: [], unpaired: [] }) } }]);
  await expect(deletePlotRun("token", 10)).resolves.toEqual({ deletedRunIds: [10], activeRunId: null, mode: "ready" });
  expect(disconnect).toHaveBeenCalledWith(99);
});

it("does not publish until two people have checked in", async () => {
  mocks.allItems.mockResolvedValue([]);
  await expect(publishPlotRound("token", 1, { romantic: false, romanticPreferences: true })).rejects.toThrow("check in");
  expect(mocks.createBlock).not.toHaveBeenCalled();
});

it("check-in connects the signed-in person's profile channel and avoids duplicates", async () => {
  const connect = vi.fn();
  mocks.manager.mockResolvedValue({ item: mocks.item, connect });
  mocks.allItems.mockResolvedValue([]);
  await checkInToPlot("token", 123);
  expect(connect).toHaveBeenCalledWith(100, { id: 321, type: "Channel" }, { app: "connections", role: "plot_attendee" });
  connect.mockClear();
  mocks.allItems.mockResolvedValue([{ id: 321, type: "Channel" }]);
  await checkInToPlot("token", 123);
  expect(connect).not.toHaveBeenCalled();
});

it("can publish for the whole directory when check-in restriction is disabled", async () => {
  mocks.allItems.mockResolvedValue([]);
  mocks.createBlock.mockResolvedValue({ id: 123 });
  const result = await publishPlotRound("token", 1, { romantic: false, romanticPreferences: true, checkedInOnly: false });
  expect(result.pairs).toHaveLength(1);
  expect(mocks.createBlock.mock.calls[0][2]).toContain("checkedInOnly: false");
});

it("changes event mode without changing the selected round", async () => {
  await expect(setPlotMode("token", "prompt")).resolves.toEqual({ mode: "prompt" });
  const content = mocks.updateBlock.mock.calls[0][1].content;
  expect(content).toContain("mode: prompt");
  expect(content).toContain("active_run_id: 4");
});
