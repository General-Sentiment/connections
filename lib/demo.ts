import samples from "./fixtures/blocks.json";
import type { Item, Person, Profile, Message } from "./types";
import type { Details } from "./details";
const date = "2026-09-09T12:00:00Z";
export const demoPeople: Person[] = [
  { id: 900001, type: "User", name: "Maya Chen", slug: "maya-chen" },
  { id: 900002, type: "User", name: "Alex Lee", slug: "alex-lee" },
  { id: 900003, type: "User", name: "Sam Rivera", slug: "sam-rivera" },
  { id: 900004, type: "User", name: "Nora Ellis", slug: "nora-ellis" },
  { id: 900005, type: "User", name: "Eli Park", slug: "eli-park" },
  { id: 900006, type: "User", name: "Lou Martin", slug: "lou-martin" },
];
export function demoChannel(id: number, title: string, person = demoPeople[0], blocks = 6): Item {
  return { id, type: "Channel", title, slug: `preview-${id}`, owner: person, visibility: "closed", state: "available", created_at: date, updated_at: date, counts: { blocks, channels: 0, contents: blocks }, metadata: { app: "connections", profile_user_id: person.id } };
}
export const demoBlocks = samples as unknown as Item[];
export const demoProfiles: Profile[] = demoPeople.map((person, i) => ({
  channel: demoChannel(800001 + i, person.name, person), person,
  lookingFor: ["People to exchange references with, take long walks, and make small things together.", "A regular conversation about things we're reading, seeing, and working on.", "Collaborators for small publications and experiments in public space.", "New friends, film nights, and unhurried conversations.", "Someone to make music with. Also open to seeing where a conversation goes.", "People who enjoy collecting, noticing, and sharing things."][i],
  details: { schema: "connections_profile", version: 1, location: { city: ["Copenhagen", "Los Angeles", "Mexico City", "London", "Seoul", "Paris"][i], country: ["Denmark", "United States", "Mexico", "United Kingdom", "South Korea", "France"][i] }, open_to: ["conversation", "friendship", ...(i % 2 ? [] : ["creative_partnership"])] as Details["open_to"], local_only: i === 3 },
  selected: [demoBlocks[0], { ...demoChannel(700001 + i, ["Ways of gathering", "Loose observations", "Printed matter", "Watching together", "Listening room", "Everyday objects"][i], person, 24), metadata: {} }, demoBlocks[1]],
}));
export const demoMessages: Message[] = [
  { id: "sample-1", sender: demoPeople[1], sentAt: "2026-09-09T10:42:00Z", text: "Hi Maya, I liked your collection on gathering. This made me think of it.", attachments: [{ ...demoChannel(700010, "Spaces for being together", demoPeople[1], 18), metadata: {} }] },
  { id: "sample-2", sender: demoPeople[0], sentAt: "2026-09-09T10:46:00Z", text: "Thank you! These are exactly the kinds of spaces I’ve been thinking about.", attachments: [] },
];
