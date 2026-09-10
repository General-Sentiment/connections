import { parseDocument, stringify } from "yaml";
import { z } from "zod";

export const intentions = [
  ["conversation", "Conversation"], ["friendship", "Friendship"],
  ["creative_partnership", "Creative partnership"], ["romance", "Romance"],
  ["meeting_new_people", "Meeting new people"], ["employment", "Employment"],
] as const;
export const detailsSchema = z.object({
  schema: z.literal("connections_profile"), version: z.literal(1),
  location: z.object({ city: z.string().trim().min(1).max(100), country: z.string().trim().min(1).max(100) }).strict(),
  open_to: z.array(z.enum(intentions.map(([value]) => value))).min(1).max(intentions.length).refine(v => new Set(v).size === v.length, "Choose each intention once."),
  local_only: z.boolean(),
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
  selected: z.array(selectionSchema.extend({ description: z.string().trim().max(5000).default("") })).length(3, "Choose exactly three blocks or channels.").refine(v => new Set(v.map(x => `${x.type}:${x.id}`)).size === 3, "Choose three different items."),
  useAccountPhoto: z.boolean().default(false),
  photoProof: z.string().max(4000).optional(), photoKey: z.string().max(1000).optional(), removePhoto: z.boolean().default(false),
}).strict();
