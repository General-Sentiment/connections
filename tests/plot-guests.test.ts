import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ allItems: vi.fn(), createBlock: vi.fn(), updateBlock: vi.fn(), item: vi.fn() }));
vi.mock("../lib/arena-discovery", () => ({ allItems: mocks.allItems }));
vi.mock("../lib/directory-auth", () => ({ directoryClient: async () => ({ item: mocks.item, createBlock: mocks.createBlock, updateBlock: mocks.updateBlock }) }));
vi.mock("../lib/plot-pairings", () => ({ plotChannel: () => "plot", plotYaml: JSON.stringify, parsePlotYaml: (text: string, schema: { parse: (x: unknown) => unknown }) => schema.parse(JSON.parse(text)), readActivePlotPrompt: async () => "one", pinnedPrompt: () => ({ id: 90 }) }));
import { registerPlotGuest, readPlotGuestProfiles, saveGuestPlotAnswer } from "../lib/plot-guests";
const identity = { id: "7aac0389-0b97-4923-8061-b200d1f66b63", secret: "a".repeat(48), name: "Guest One" };
beforeEach(() => { vi.clearAllMocks(); mocks.allItems.mockResolvedValue([]); mocks.item.mockResolvedValue({ id: 10 }); mocks.createBlock.mockResolvedValue({ id: 55 }); });
it("creates a stable guest identity without saving the secret in public state", async () => {
  const guest = await registerPlotGuest(identity);
  const data = JSON.parse(mocks.createBlock.mock.calls[0][2]);
  expect(data.participants[0].userId).toBe(guest.userId);
  expect(data.participants[0].secretHash).not.toBe(identity.secret);
  expect(JSON.stringify(data)).not.toContain(identity.secret);
  mocks.allItems.mockResolvedValue([{ title: "participants", type: "Text", content: { markdown: JSON.stringify(data) } }]);
  await expect(registerPlotGuest(identity)).resolves.toEqual(guest);
  expect(mocks.createBlock).toHaveBeenCalledTimes(1);
  await expect(registerPlotGuest({ ...identity, secret: "b".repeat(48) })).rejects.toThrow("restored");
});
it("includes answered guests and manual participants in the right pool", async () => {
  await registerPlotGuest(identity);
  const data = JSON.parse(mocks.createBlock.mock.calls[0][2]);
  mocks.allItems.mockResolvedValue([{ title: "participants", type: "Text", content: { markdown: JSON.stringify(data) } }]);
  expect(await readPlotGuestProfiles(new Set())).toHaveLength(0);
  expect(await readPlotGuestProfiles(new Set([data.participants[0].userId]))).toHaveLength(1);
  data.participants[0].manual = true;
  mocks.allItems.mockResolvedValue([{ title: "participants", type: "Text", content: { markdown: JSON.stringify(data) } }]);
  expect(await readPlotGuestProfiles(new Set())).toHaveLength(1);
});
it("stores answers attributed to the guest rather than the event account", async () => {
  await saveGuestPlotAnswer({ userId: 123, name: "Guest One" }, 90, "My answer", identity.id);
  expect(mocks.createBlock.mock.calls[0][4]).toMatchObject({ guest_user_id: 123, guest_name: "Guest One", prompt_id: 90 });
});
it("updates a guest answer instead of duplicating it when retried", async () => {
  mocks.allItems.mockResolvedValue([{ id: 55, connection: { metadata: { guest_user_id: 123 } }, content: { markdown: "My answer" } }]);
  await saveGuestPlotAnswer({ userId: 123, name: "Guest One" }, 90, "My answer", identity.id);
  expect(mocks.createBlock).not.toHaveBeenCalled();
  expect(mocks.updateBlock).not.toHaveBeenCalled();
  await saveGuestPlotAnswer({ userId: 123, name: "Guest One" }, 90, "Changed answer", identity.id);
  expect(mocks.updateBlock).toHaveBeenCalledWith(55, { content: "Changed answer" });
});
it("rejects an answer submitted for a previous prompt", async () => {
  await expect(saveGuestPlotAnswer({ userId: 123, name: "Guest" }, 91, "Answer", identity.id)).rejects.toThrow("prompt changed");
  expect(mocks.createBlock).not.toHaveBeenCalled();
});
