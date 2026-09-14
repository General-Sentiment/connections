import { Fragment } from "react";
import { responseLinks } from "@/lib/response-links";

export function ResponseText({ children }: { children: string }) {
  let offset = 0;
  const links = responseLinks(children).map(match => {
    const before = children.slice(offset, match.index);
    offset = match.lastIndex;
    return <Fragment key={match.index}>{before}<a href={match.url} target="_blank" rel="noopener noreferrer">{match.raw}</a></Fragment>;
  });
  return <>{links}{children.slice(offset)}</>;
}
