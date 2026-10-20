import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ tokens: [] as (string | undefined)[], item: vi.fn(), connect: vi.fn(), createBlock: vi.fn(), updateBlock: vi.fn(), disconnect: vi.fn(), items: vi.fn(), ref: vi.fn(), profile: vi.fn(), verify: vi.fn() }));
vi.mock("../lib/arena", async () => {
  const original = await vi.importActual<typeof import("../lib/arena")>("../lib/arena");
  return { ...original, ArenaClient: class { constructor(token?: string) { m.tokens.push(token); } item = m.item; connect = m.connect; createBlock = m.createBlock; updateBlock = m.updateBlock; disconnect = m.disconnect; } };
});
vi.mock("../lib/arena-discovery", () => ({ allItems: m.items }));
vi.mock("../lib/profiles", () => ({ availableProfileRef: m.ref, readProfile: m.profile, verifySelection: m.verify, roleOf: (item: any) => item.connection?.metadata?.role || item.metadata?.role }));
vi.mock("../lib/plot-pairings", () => ({ readActivePlotPrompt: async () => "one", pinnedPrompt: () => ({ id: 90, text: "What inspires you?" }) }));
import { savePlotAnswer } from "../lib/plot-answers";
import { demoProfiles, demoPeople } from "../lib/demo";
const person = demoPeople[0];
const details = { id: 50, type: "Text", user: person, connection: { id: 60, metadata: { role: "details" } } };
beforeEach(() => {
  vi.clearAllMocks(); m.tokens.length = 0;
  m.item.mockResolvedValue({ id: 100, can: { add_to: true } });
  m.ref.mockResolvedValue({ published: 1, channel_id: 200 });
  m.profile.mockResolvedValue({ ...demoProfiles[0], channel: { ...demoProfiles[0].channel, can: { add_to: true } }, detailsBlock: details });
  m.items.mockImplementation(async (_client, path) => path.includes("/channels/100/") ? [{ id: 90, type: "Text", user: person }] : [details]);
  m.verify.mockResolvedValue([{ id: 80, title: "Answer", type: "Text" }]);
});
it("connects the answer to the prompt channel and the prompt/answer to the profile using the user token", async () => {
  await savePlotAnswer(person, "user-token", { promptId: 90, answer: { id: 80, type: "Block" }, description: "My reason" });
  expect(m.tokens).toEqual(["user-token"]);
  expect(m.connect).toHaveBeenCalledWith(100, { id: 80, type: "Block" }, expect.objectContaining({ role: "plot_answer", user_id: person.id }));
  expect(m.connect).toHaveBeenCalledWith(200, { id: 90, type: "Block" }, expect.objectContaining({ role: "selected_prompt" }));
  expect(m.connect).toHaveBeenCalledWith(200, { id: 80, type: "Block" }, expect.objectContaining({ role: "selected" }));
  expect(m.updateBlock.mock.calls[0][1].content).toContain("What inspires you?");
  expect(m.createBlock).toHaveBeenCalledWith(200, "Answer", "My reason", "selected_description", { selected_type: "Block", selected_id: 80 });
});
it("rejects a stale prompt before making any writes", async () => {
  await expect(savePlotAnswer(person, "user-token", { promptId: 91, answer: { id: 80, type: "Block" }, description: "" })).rejects.toMatchObject({ status: 409 });
  expect(m.connect).not.toHaveBeenCalled(); expect(m.updateBlock).not.toHaveBeenCalled();
});
it("avoids duplicate connections when the same answer is saved again", async () => {
  m.items.mockImplementation(async (_client, path) => path.includes("/channels/100/") ? [{ id: 90, type: "Text" }, { id: 80, type: "Text" }] : [details, { id: 90, type: "Text", metadata: { role: "selected_prompt" } }, { id: 80, type: "Text", metadata: { role: "selected" } }]);
  await savePlotAnswer(person, "user-token", { promptId: 90, answer: { id: 80, type: "Block" }, description: "" });
  expect(m.connect).not.toHaveBeenCalled();
});
