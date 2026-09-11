import { expect, it, vi } from "vitest";
import { ArenaClient } from "../lib/arena";
import { readProfile } from "../lib/profiles";
import type { Item, Person } from "../lib/types";

it("reuses directory channels and embedded authors instead of fetching them again", async () => {
  const person = { id: 42, type: "User", name: "Person", slug: "person", avatar: "https://example.com/avatar.jpg" } as Person;
  const channel = { id: 1, title: "Profile", state: "available", created_at: "2026-01-01", updated_at: "2026-01-01", type: "Channel", visibility: "public", metadata: { app: "connections", profile_user_id: 42 } } as Item;
  const client = new ArenaClient();
  const request = vi.spyOn(client, "request").mockResolvedValue({ data: [{ id: 2, type: "Text", state: "available", visibility: "public", user: person }], meta: { next_page: null } });
  const item = vi.spyOn(client, "item");
  const user = vi.spyOn(client, "user");
  const profile = await readProfile(1, client, channel);
  expect(profile.person).toEqual(person);
  expect(request).toHaveBeenCalledTimes(1);
  expect(item).not.toHaveBeenCalled();
  expect(user).not.toHaveBeenCalled();
});
