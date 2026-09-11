import type { ProfilePrompt } from "./prompts";

const question = (prompt: ProfilePrompt) => prompt.text.trim().replace(/\s+/g, " ").toLocaleLowerCase();
export function unusedPrompts(options: ProfilePrompt[], chosen: (ProfilePrompt | undefined)[]) {
  return options.filter(prompt => !chosen.some(other => other && (other.id === prompt.id || question(other) === question(prompt))));
}
export function fillPrompts(options: ProfilePrompt[], previous: (ProfilePrompt | undefined)[]) {
  const next = previous.map((prompt, index) => prompt && unusedPrompts([prompt], previous.slice(0, index)).length ? prompt : undefined);
  for (let index = 0; index < Math.max(3, previous.length); index++) {
    if (next[index]) continue;
    const choices = unusedPrompts(options, next);
    next[index] = choices[Math.floor(Math.random() * choices.length)];
  }
  return next;
}
