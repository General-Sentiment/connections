import type { Item, Metadata, Page, Person } from "./types";

import { arenaRequest } from "./arena-requests";
export { ArenaError } from "./arena-requests";
export class ArenaClient {
  constructor(private token?: string, private cachePublic = true) {}
  async request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
    if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Invalid API path.");
    return arenaRequest<T>(path, this.token, options, this.cachePublic);
  }
  me() { return this.request<Person>("/me"); }
  user(id: string | number) { return this.request<Person>(`/users/${encodeURIComponent(id)}`); }
  item(type: "Block" | "Channel", id: string | number) { return this.request<Item>(`/${type === "Block" ? "blocks" : "channels"}/${encodeURIComponent(id)}`); }
  contents(channel: string | number, page = 1, per = 24, sort = "position_asc") {
    return this.request<Page<Item>>(`/channels/${encodeURIComponent(channel)}/contents?page=${page}&per=${per}&sort=${sort}`);
  }
  userContents(id: number, type: "Block" | "Channel", page = 1, per = 24) {
    return this.request<Page<Item>>(`/users/${id}/contents?type=${type}&page=${page}&per=${per}&sort=created_at_desc`);
  }
  createChannel(title: string, options: { owner?: { id: number; type: "Group" | "User" }; visibility?: string; metadata?: Metadata } = {}) {
    return this.request<Item>("/channels", { method: "POST", body: { title, visibility: "closed", ...options } });
  }
  createBlock(channel: number, title: string, value: string, role: string, extra: Metadata = {}) {
    if (["message", "description", "biography", "selected_description", "details"].includes(role) && /^https?:\/\/\S+$/.test(value)) value = `<${value}>`;
    return this.request<Item>("/blocks", { method: "POST", body: { title, value, metadata: { app: "connections", role }, channels: [{ id: channel, metadata: { app: "connections", role, ...extra } }] } });
  }
  connect(channel: number | string, item: { id: number; type: "Block" | "Channel" }, metadata: Metadata, position?: number) {
    return this.request<{ data: { id: number }[] }>("/connections", { method: "POST", body: { connectable_id: item.id, connectable_type: item.type, channels: [{ id: channel, metadata, ...(position ? { position } : {}) }] } });
  }
  updateBlock(id: number, body: { title?: string; content?: string }) { return this.request<Item>(`/blocks/${id}`, { method: "PUT", body }); }
  updateChannel(id: number, body: { title?: string; description?: string; metadata?: Metadata }) { return this.request<Item>(`/channels/${id}`, { method: "PUT", body }); }
  disconnect(connection: number) { return this.request<void>(`/connections/${connection}`, { method: "DELETE" }); }
}
