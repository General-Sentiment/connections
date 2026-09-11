import type { Message } from "./types";

export function messageGroups(messages: Message[]) {
  const groups: { id: string; sentAt: string; messages: Message[] }[] = [];
  let previous: Message | undefined;
  for (const message of messages) {
    const time = new Date(message.sentAt);
    const prior = previous && new Date(previous.sentAt);
    if (!prior || time.getTime() - prior.getTime() >= 30 * 60 * 1000) {
      groups.push({ id: message.id, sentAt: message.sentAt, messages: [] });
    }
    groups[groups.length - 1].messages.push(message);
    previous = message;
  }
  return groups;
}
