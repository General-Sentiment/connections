import { expect, it } from "vitest";
import { messageGroups } from "../lib/message-groups";
import type { Message } from "../lib/types";
const message = (id: string, sentAt: string, sender = 1): Message => ({ id, sentAt, sender: { id: sender, type: "User", name: "Person", slug: "person" }, text: id, attachments: [] });
it("groups a continuous exchange across senders and splits at a 30-minute pause", () => {
  const messages = [message("1", "2026-09-10T12:00:00Z"), message("2", "2026-09-10T12:29:00Z", 2), message("3", "2026-09-10T12:58:00Z"), message("4", "2026-09-10T13:28:00Z")];
  expect(messageGroups(messages).map(g => g.messages.map(m => m.id))).toEqual([["1", "2", "3"], ["4"]]);
});
it("keeps nearby messages together across midnight and handles empty conversations", () => {
  expect(messageGroups([])).toEqual([]);
  expect(messageGroups([message("1", "2026-09-10T23:59:00Z"), message("2", "2026-09-11T00:01:00Z")])).toHaveLength(1);
});
