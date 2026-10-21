"use client";
import { useState } from "react";
import { CardFace } from "./card";
import { arenaUrl } from "@/lib/urls";
import type { Item } from "@/lib/types";
export function PlotAnswerSlideshow({ prompt, answers }: { prompt: string; answers: { item: Item; author: string }[] }) {
  const [index, setIndex] = useState(0);
  const activeIndex = Math.min(index, Math.max(0, answers.length - 1));
  const answer = answers[activeIndex];
  const move = (direction: number) => setIndex((activeIndex + direction + answers.length) % answers.length);
  return <section className="plot-slideshow" aria-label="Prompt answer slideshow" tabIndex={0} onKeyDown={event => { if (answers.length > 1 && (event.key === "ArrowLeft" || event.key === "ArrowRight")) { event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1); } }}>
    <h2>{prompt}</h2>
    {answer ? <><div className="plot-slide-stage"><button type="button" className="outline plot-slide-previous" aria-label="Previous answer" disabled={answers.length < 2} onClick={() => move(-1)}>←</button><div className="plot-answer-slide" aria-live="polite"><a href={arenaUrl(answer.item)} target="_blank" rel="noopener noreferrer"><CardFace item={answer.item} /></a></div><button type="button" className="outline plot-slide-next" aria-label="Next answer" disabled={answers.length < 2} onClick={() => move(1)}>→</button></div>{answer.author && <p className="muted">{answer.author}</p>}</> : <p className="empty">No answers yet.</p>}
  </section>;
}
