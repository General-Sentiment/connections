import type { ProfilePrompt } from "@/lib/prompts";
export function PromptAuthor({ prompt }: { prompt?: ProfilePrompt }) {
  return prompt?.author ? <span className="prompt-author">by <a href={`https://www.are.na/${encodeURIComponent(prompt.author.slug)}`} target="_blank" rel="noopener noreferrer">{prompt.author.name}</a></span> : null;
}
