import { LinkifyIt } from "linkify-it";
import tlds from "tlds";
import type { Root, RootContent } from "mdast";

const linkify = new LinkifyIt({ fuzzyLink: true }).tlds(tlds).add("ftp:", null);

export function responseLinks(text: string) {
  return (linkify.match(text) || []).map(match => ({
    ...match,
    url: match.schema === "" && !match.url.startsWith("mailto:") ? `https://${match.raw}` : match.url,
  }));
}

export function remarkResponseLinks() {
  return (tree: Root) => {
    function walk(parent: Root | RootContent) {
      if (!("children" in parent) || parent.type === "link" || parent.type === "linkReference") return;
      const children: RootContent[] = [];
      for (const child of parent.children) {
        if (child.type !== "text") { walk(child); children.push(child); continue; }
        let offset = 0;
        for (const match of responseLinks(child.value)) {
          if (match.index > offset) children.push({ type: "text", value: child.value.slice(offset, match.index) });
          children.push({ type: "link", url: match.url, children: [{ type: "text", value: match.raw }] });
          offset = match.lastIndex;
        }
        if (offset < child.value.length) children.push({ type: "text", value: child.value.slice(offset) });
      }
      // Each replacement preserves its parent's inline or block content category.
      parent.children = children as typeof parent.children;
    }
    walk(tree);
  };
}
