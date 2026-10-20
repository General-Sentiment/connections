import { z } from "zod";
import { ArenaClient, ArenaError } from "./arena";
import { allItems } from "./arena-discovery";
import { availableProfileRef, readProfile, roleOf, verifySelection } from "./profiles";
import { readActivePlotPrompt, pinnedPrompt } from "./plot-pairings";
import { promptSchema, selectionSchema, serializeDetails } from "./details";
import { itemKey } from "./urls";
import { withLock } from "./coordination";
import type { Person } from "./types";
export const plotAnswerSchema = z.object({ promptId: z.number().int().positive(), answer: selectionSchema, description: z.string().trim().max(5000).default("") }).strict();
export async function savePlotAnswer(person: Person, token: string, input: z.infer<typeof plotAnswerSchema>) {
  return withLock(`profile:${person.id}`, async () => {
    const client = new ArenaClient(token);
    const active = await readActivePlotPrompt();
    const promptChannel = await client.item("Channel", active === "one" ? "plot-prompt-one" : "plot-prompt-two");
    if (!promptChannel.can?.add_to) throw new ArenaError(403, "Your account cannot connect answers to the prompt channel.");
    const promptItems = await allItems(client, `/channels/${promptChannel.id}/contents`);
    const pinned = pinnedPrompt(promptItems);
    if (pinned.id !== input.promptId) throw new ArenaError(409, "The active prompt changed. Refresh before answering.");
    if (input.answer.type === "Block" && input.answer.id === pinned.id) throw new ArenaError(400, "Choose an answer other than the prompt itself.");
    const source = promptItems.find(item => item.id === pinned.id)!;
    const prompt = promptSchema.parse({ id: pinned.id, text: pinned.text, ...(source.user?.name && source.user.slug ? { author: { name: source.user.name, slug: source.user.slug } } : {}) });
    const ref = await availableProfileRef(person.id, client);
    if (!ref?.published) throw new ArenaError(400, "Create your Connections profile before saving an answer.");
    const profile = await readProfile(ref.channel_id, client);
    if (!profile.channel.can?.add_to || profile.warning) throw new ArenaError(400, "Your profile needs updating before adding an answer.");
    const [answer] = await verifySelection(client, person, [input.answer]);
    const items = await allItems(client, `/channels/${ref.channel_id}/contents`);
    const details = profile.detailsBlock;
    if (details && details.user?.id !== person.id) throw new ArenaError(403, "Your profile details belong to another account.");
    const key = `${input.answer.type}:${input.answer.id}`;
    const selectedPrompts = { ...profile.details.selected_prompts };
    if (selectedPrompts[key] && selectedPrompts[key].id !== prompt.id) throw new ArenaError(400, "That item already answers another profile prompt. Choose a different item.");
    const previousKeys = Object.entries(selectedPrompts).filter(([oldKey, value]) => oldKey !== key && value.id === prompt.id).map(([oldKey]) => oldKey);
    for (const oldKey of previousKeys) delete selectedPrompts[oldKey];
    selectedPrompts[key] = prompt;
    const description = items.find(item => roleOf(item) === "selected_description" && `${item.connection?.metadata?.selected_type}:${item.connection?.metadata?.selected_id}` === key);
    if (description && description.user?.id !== person.id) throw new ArenaError(403, "This answer’s description belongs to another account.");
    // Both connections use the attendee's OAuth token, never the operator token.
    if (!promptItems.some(item => item.id === answer.id && (item.type === "Channel" ? "Channel" : "Block") === input.answer.type)) await client.connect(promptChannel.id, input.answer, { app: "connections", role: "plot_answer", prompt_id: prompt.id, user_id: person.id });
    if (!items.some(item => roleOf(item) === "selected_prompt" && item.id === prompt.id)) await client.connect(ref.channel_id, { id: prompt.id, type: "Block" }, { app: "connections", role: "selected_prompt" });
    if (!items.some(item => roleOf(item) === "selected" && itemKey(item) === key)) await client.connect(ref.channel_id, input.answer, { app: "connections", role: "selected" });
    if (input.description) {
      if (description) await client.updateBlock(description.id, { title: answer.title || "Answer", content: input.description });
      else await client.createBlock(ref.channel_id, answer.title || "Answer", input.description, "selected_description", { selected_type: input.answer.type, selected_id: input.answer.id });
    } else if (description?.connection) await client.disconnect(description.connection.id);
    const content = serializeDetails({ ...profile.details, selected_prompts: selectedPrompts });
    if (details) await client.updateBlock(details.id, { content });
    else await client.createBlock(ref.channel_id, "details", content, "details");
    // Replace only an earlier response to this prompt, retaining other profile selections.
    for (const item of items) {
      const oldKey = roleOf(item) === "selected_description" ? `${item.connection?.metadata?.selected_type}:${item.connection?.metadata?.selected_id}` : itemKey(item);
      if (previousKeys.includes(oldKey) && ["selected", "selected_description"].includes(String(roleOf(item))) && item.connection) await client.disconnect(item.connection.id);
    }
    return { profileId: ref.channel_id, promptId: prompt.id, answerId: answer.id };
  });
}
