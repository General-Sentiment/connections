import type { Profile } from "./types";
type Result = { profiles: Profile[]; skipped: number };
export async function fetchMatchProfiles(onProgress: (message: string) => void, checkedInOnly = false): Promise<Result> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10 * 60 * 1000);
  try {
    const response = await fetch(checkedInOnly ? "/api/match/profiles?checkedInOnly=true" : "/api/match/profiles", { cache: "no-store", signal: controller.signal });
    if (!response.ok || !response.headers.get("content-type")?.includes("application/x-ndjson")) {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Profiles couldn’t be loaded. Try again.");
      return result;
    }
    if (!response.body) throw new Error("The profile request was interrupted. Try again.");
    const reader = response.body.getReader();
    const decoder = new TextDecoder(); let buffer = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n"); buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.status === "error") throw new Error(event.error);
          if (event.status === "complete") return { profiles: event.profiles, skipped: event.skipped };
          if (event.message) onProgress(event.message);
          else if (typeof event.total === "number" && event.total > 0) onProgress(`Loading preferences: ${event.loaded} of ${event.total} profiles checked…`);
        }
        if (done) throw new Error("The profile request ended before loading finished. Try again.");
      }
    } finally { await reader.cancel().catch(() => undefined); }
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Loading profiles took too long. Please try again.");
    throw error;
  } finally { clearTimeout(timeout); }
}
