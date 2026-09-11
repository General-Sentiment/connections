import { afterEach, expect, it, vi } from "vitest";
import { profilePrompts, resetPromptCacheForTests } from "../lib/prompts";
import { resetArenaRequestsForTests } from "../lib/arena-requests";
import { parseDetails, serializeDetails } from "../lib/details";
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); resetPromptCacheForTests(); resetArenaRequestsForTests(); });
it("caches prompts for five minutes and follows channel pagination", async () => {
  let now = 100000; vi.spyOn(Date, "now").mockImplementation(() => now);
  let text = "We should…";
  const fetcher = vi.fn(async (url: string) => {
    const page = Number(new URL(url).searchParams.get("page"));
    return new Response(JSON.stringify({ data: page === 1 ? [{ id: 1, type: "Text", state: "available", visibility: "public", content: { markdown: text } }] : [{ id: 2, type: "Image", state: "available", visibility: "public" }], meta: { next_page: page === 1 ? 2 : null } }), { headers: { "Cache-Control": "public, max-age=300" } });
  });
  vi.stubGlobal("fetch", fetcher);
  expect(await profilePrompts()).toEqual([{ id: 1, text: "We should…" }]);
  text = "A different prompt";
  expect(await profilePrompts()).toEqual([{ id: 1, text: "We should…" }]);
  expect(fetcher).toHaveBeenCalledTimes(2);
  now += 300001;
  expect(await profilePrompts()).toEqual([{ id: 1, text }]);
  expect(fetcher).toHaveBeenCalledTimes(4);
});
it("round-trips the chosen prompt with its block in Are.na details", () => {
  const details = { schema: "connections_profile" as const, version: 1 as const, location: { city: "Paris", country: "France" }, open_to: ["conversation" as const], local_only: false, selected_prompts: { "Block:23": { id: 1, text: "We should…" }, "Channel:24": { id: 2, text: "Typical Sunday" } } };
  expect(parseDetails(serializeDetails(details)).selected_prompts).toEqual(details.selected_prompts);
});

it("keeps initial questions and remix choices unique across all three slots", async () => {
  const { fillPrompts, unusedPrompts } = await import("../lib/prompt-selection");
  const options = [
    { id: 1, text: "Typical Sunday" }, { id: 2, text: " typical   sunday " },
    { id: 3, text: "My favorite sound" }, { id: 4, text: "We should…" },
    { id: 5, text: "I woke up like…" },
  ];
  const chosen = fillPrompts(options, [options[0], options[1], options[2]]);
  expect(chosen[0]).toEqual(options[0]);
  expect(chosen[2]).toEqual(options[2]);
  expect(chosen.filter(Boolean)).toHaveLength(3);
  expect(unusedPrompts(options, chosen)).toHaveLength(1);
  expect(fillPrompts(options.slice(0, 2), []).filter(Boolean)).toHaveLength(1);
});

it("rejects repeated prompt IDs or questions when saving", async () => {
  const { profileInputSchema } = await import("../lib/details");
  const input = {
    whoAreYou: "An artist", lookingFor: "Conversation",
    details: { schema: "connections_profile", version: 1, location: { city: "Paris", country: "France" }, open_to: ["conversation"], local_only: false },
    selected: [1, 2, 3].map(id => ({ id: id + 100, type: "Block", prompt: { id, text: `Question ${id}` } })),
  };
  expect(profileInputSchema.safeParse(input).success).toBe(true);
  const extended = { ...input, selected: [...input.selected, { id: 104, type: "Block", prompt: { id: 4, text: "Question 4" } }] };
  expect(profileInputSchema.safeParse(extended).success).toBe(true);
  expect(profileInputSchema.safeParse({ ...input, selected: input.selected.slice(0, 2) }).success).toBe(false);
  input.selected[1].prompt = { id: 1, text: "Another question" };
  expect(profileInputSchema.safeParse(input).success).toBe(false);
  input.selected[1].prompt = { id: 2, text: " question  1 " };
  expect(profileInputSchema.safeParse(input).success).toBe(false);
});

it("preserves extra prompt slots when editing a larger profile", async () => {
  const { fillPrompts } = await import("../lib/prompt-selection");
  const prompts = [1, 2, 3, 4, 5].map(id => ({ id, text: `Question ${id}` }));
  expect(fillPrompts(prompts, prompts)).toEqual(prompts);
});
