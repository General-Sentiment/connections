import { expect, it, vi } from "vitest";
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
import { parsePlotYaml, plotYaml, plotRunSchema, plotStateSchema, pinnedPrompt, profilePromptAnswers, plotPromptResponses } from "../lib/plot-pairings";
it("round-trips immutable runs and the active pointer", () => {
  const run = { schema: "plot_pairings", version: 1, created_at: "2026-10-20T00:00:00Z", created_by: 1, settings: { romantic: false, romanticPreferences: true }, pairs: [{ first: { user_id: 1, profile_id: 11, name: "A" }, second: { user_id: 2, profile_id: 12, name: "B" }, shared: ["friendship"] }], unpaired: [] };
  expect(parsePlotYaml(plotYaml(run), plotRunSchema)).toEqual(run);
  const state = { schema: "plot_state", version: 1, active_run_id: 123, updated_at: "now" };
  expect(parsePlotYaml(plotYaml(state), plotStateSchema)).toEqual(state);
});
it("rejects duplicate pointers, wrong schema, and invalid IDs", () => {
  expect(() => parsePlotYaml("schema: plot_state\nversion: 1\nactive_run_id: 1\nactive_run_id: 2\nupdated_at: now", plotStateSchema)).toThrow();
  expect(() => parsePlotYaml(plotYaml({ schema: "other", version: 1, active_run_id: 1, updated_at: "now" }), plotStateSchema)).toThrow();
  expect(() => parsePlotYaml(plotYaml({ schema: "plot_state", version: 1, active_run_id: -1, updated_at: "now" }), plotStateSchema)).toThrow();
});

it("reads exactly the pinned public text block", () => {
  const base = { id: 1, type: "Text" as const, title: null, state: "available", visibility: "public", created_at: "now", updated_at: "later", content: { markdown: "Pinned question", plain: "Pinned question" }, connection: { id: 1, position: 1, pinned: true, connected_at: "now", connected_by: { id: 1, type: "User" as const, name: "A", slug: "a" } } };
  expect(pinnedPrompt([{ ...base, id: 2, connection: { ...base.connection, pinned: false } }, base])).toEqual({ id: 1, text: "Pinned question", revision: "1:later" });
  expect(() => pinnedPrompt([])).toThrow("Pin exactly one");
  expect(() => pinnedPrompt([base, { ...base, id: 3 }])).toThrow("Pin exactly one");
  expect(() => pinnedPrompt([{ ...base, visibility: "private" }])).toThrow("Pin exactly one");
});

it("returns only selected items with answered prompts, including their descriptions", async () => {
  const { demoProfiles } = await import("../lib/demo");
  const profile = { ...demoProfiles[0], details: { ...demoProfiles[0].details, selected_prompts: { [`Block:${demoProfiles[0].selected[0].id}`]: { id: 10, text: "A question" } } }, selectedDescriptions: { [`Block:${demoProfiles[0].selected[0].id}`]: "My answer description" } };
  const answers = profilePromptAnswers(profile);
  expect(answers).toHaveLength(1);
  expect(answers[0].prompt.text).toBe("A question");
  expect(answers[0].description).toBe("My answer description");
});

it("slideshow excludes the pinned prompt and private or processing answers", async () => {
  const { demoProfiles } = await import("../lib/demo");
  const base = demoProfiles[0].selected[0];
  const prompt = { ...base, id: 1, type: "Text" as const, visibility: "public", state: "available", content: { markdown: "Question", plain: "Question" }, connection: { id: 1, position: 1, pinned: true, connected_at: "now", connected_by: demoProfiles[0].person } };
  const answer = { ...base, id: 2, visibility: "public", state: "available", connection: { ...prompt.connection, id: 2, pinned: false } };
  const result = plotPromptResponses([prompt, answer, { ...answer, id: 3, visibility: "private" }, { ...answer, id: 4, state: "processing" }]);
  expect(result.answers).toHaveLength(1);
  expect(result.answers[0].item.id).toBe(2);
  expect(result.answers[0].author).toBe(demoProfiles[0].person.name);
});
