import { describe, expect, it } from "vitest";
import { responseLinks, remarkResponseLinks } from "../lib/response-links";
import type { Root } from "mdast";

describe("response links", () => {
  it("links bare domains and full URLs without trailing punctuation", () => {
    expect(responseLinks("yatu.xyz\nRead https://www.are.na/editorial/an-interview-with-yatu-espinosa.").map(({ raw, url }) => ({ raw, url }))).toEqual([
      { raw: "yatu.xyz", url: "https://yatu.xyz" },
      { raw: "https://www.are.na/editorial/an-interview-with-yatu-espinosa", url: "https://www.are.na/editorial/an-interview-with-yatu-espinosa" },
    ]);
  });
  it("preserves existing Markdown links and code", () => {
    const tree: Root = { type: "root", children: [{ type: "paragraph", children: [
      { type: "link", url: "https://example.com", children: [{ type: "text", value: "yatu.xyz" }] },
      { type: "inlineCode", value: "yatu.xyz" },
      { type: "text", value: " yatu.xyz" },
    ] }] };
    remarkResponseLinks()(tree);
    const paragraph = tree.children[0];
    expect(paragraph.type === "paragraph" && paragraph.children.map(node => node.type)).toEqual(["link", "inlineCode", "text", "link"]);
  });
});
