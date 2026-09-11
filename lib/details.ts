import { unusedPrompts } from "./prompt-selection";
import { locationSchema } from "./locations";
import { parseDocument, stringify } from "yaml";
import { z } from "zod";

export const intentions = [
  ["conversation", "Conversation"], ["friendship", "Friendship"],
  ["creative_partnership", "Creative partnership"], ["romance", "Romance"],
  ["meeting_new_people", "Meeting new people"], ["employment", "Employment"],
] as const;
export const promptSchema = z.object({ id: z.number().int().positive(), text: z.string().trim().min(1).max(2000), author: z.object({ name: z.string().min(1).max(300), slug: z.string().min(1).max(300) }).strict().optional() }).strict();
export const detailsSchema = z.object({
  schema: z.literal("connections_profile"), version: z.literal(1),
  location: locationSchema,
  open_to: z.array(z.enum(intentions.map(([value]) => value))).min(1).max(intentions.length).refine(v => new Set(v).size === v.length, "Choose each intention once."),
  local_only: z.boolean(),
  selected_prompts: z.record(z.string().regex(/^(Block|Channel):\d+$/), promptSchema).optional(),
}).strict();
export type Details = z.infer<typeof detailsSchema>;
export const blankDetails: Details = { schema: "connections_profile", version: 1, location: { city: "", country: "" }, open_to: [], local_only: false };
export function serializeDetails(value: Details) { return "```yaml\n" + stringify(detailsSchema.parse(value), { lineWidth: 0 }) + "```"; }
export function parseDetails(content: string): Details {
  if (content.length > 16000) throw new Error("The details block is too large.");
  const match = content.trim().match(/^```ya?ml\s*\n([\s\S]*?)\n```$/i);
  if (!match) throw new Error("The details block must contain one fenced YAML document.");
  const doc = parseDocument(match[1], { uniqueKeys: true });
  if (doc.errors.length) throw new Error("The details block contains invalid YAML.");
  return detailsSchema.parse(doc.toJS({ maxAliasCount: 0 }));
}
export const selectionSchema = z.object({ id: z.number().int().positive(), type: z.enum(["Block", "Channel"]) }).strict();
export const profileInputSchema = z.object({
  whoAreYou: z.string().trim().min(1, "Tell people who you are.").max(5000),
  lookingFor: z.string().trim().min(1, "Describe what you're looking for.").max(5000),
  details: detailsSchema,
  selected: z.array(selectionSchema.extend({ prompt: promptSchema.optional(), description: z.string().trim().max(5000).default("") })).min(3, "Choose at least three blocks or channels.").refine(v => new Set(v.map(x => `${x.type}:${x.id}`)).size === v.length, "Choose different items.").refine(v => v.every((item, index) => !item.prompt || unusedPrompts([item.prompt], v.slice(0, index).map(other => other.prompt)).length > 0), "Choose different prompts.").refine(v => !v.some(item => item.type === "Block" && v.some(other => other.prompt?.id === item.id)), "Choose a response other than one of the prompt blocks."),
  useAccountPhoto: z.boolean().default(false),
  photoProof: z.string().max(4000).optional(), photoKey: z.string().max(1000).optional(), removePhoto: z.boolean().default(false),
}).strict();
