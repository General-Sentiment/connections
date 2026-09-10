export type Metadata = Record<string, string | number | boolean | null>;
export type Person = { id: number; type: "User"; name: string; slug: string; avatar?: string | null; tier?: string };
export type Owner = Person | { id: number; type: "Group"; name: string; slug: string };
export type Markdown = { markdown: string; plain: string; html?: string };
export type ArenaConnection = { id: number; position: number; metadata?: Metadata | null; connected_at: string; connected_by: Person };
export type Item = {
  id: number; type: "Channel" | "Text" | "Image" | "Link" | "Embed" | "Attachment" | "Pending";
  base_type?: "Block"; title: string | null; slug?: string; visibility: string; state: string;
  created_at: string; updated_at: string; user?: Person; owner?: Owner; metadata?: Metadata | null;
  description?: Markdown | null; content?: Markdown; source?: { url: string; title?: string; provider?: { name: string } } | null;
  image?: { src?: string; alt_text?: string; medium?: { src: string }; large?: { src: string }; square?: { src: string } } | null;
  attachment?: { url?: string; file_name?: string; content_type?: string };
  counts?: { blocks: number; channels: number; contents: number }; collaborators?: Owner[];
  connection?: ArenaConnection | null;
  can?: { add_to?: boolean; update?: boolean; destroy?: boolean; manage_collaborators?: boolean } | null;
};
export type Page<T> = { data: T[]; meta: { current_page: number; next_page: number | null; has_more_pages: boolean; total_count: number; total_pages?: number } };
export type Profile = {
  channel: Item; person: Person; whoAreYou?: string; lookingFor: string; details: import("./details").Details;
  selected: Item[]; selectedDescriptions?: Record<string, string>; photo?: Item; profileLink?: Item; descriptionBlock?: Item; biographyBlock?: Item; detailsBlock?: Item;
  warning?: string;
};
export type Message = { id: string; sender: Person; sentAt: string; text: string; attachments: Item[] };
