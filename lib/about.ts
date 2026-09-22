import { unstable_cache } from "next/cache";
import { ArenaClient } from "./arena";

// Use the persistent Data Cache without enabling Cache Components app-wide.
// Throw on failure so a refresh retains the last successful public block.
export const readAboutBlock = unstable_cache(async (id: string) => {
  const block = await new ArenaClient().item("Block", id);
  if (block.type !== "Text" || block.visibility === "private") {
    throw new Error("The about block is not public text.");
  }
  return block;
}, ["directory-about-block-v1"], { revalidate: 86400, tags: ["directory-about"] });
