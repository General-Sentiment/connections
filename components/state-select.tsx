"use client";
import { useId, useRef } from "react";
const states = ["inactive", "ready", "pairing", "prompt"] as const;
export function StateSelect<T extends string>({ value, disabled, onChange, label = "State", options }: { value: T; disabled: boolean; onChange: (value: T) => void; label?: string; options?: readonly { value: T; label: string }[] }) {
  const choices = options || states.map(state => ({ value: state as T, label: state[0].toUpperCase() + state.slice(1) }));
  const id = useId();
  const disclosure = useRef<HTMLDetailsElement>(null);
  return <div className="field plot-state-select"><span id={id}>{label}</span><details className="state-dropdown" ref={disclosure} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.open = false; }} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); if (disclosure.current) disclosure.current.open = false; disclosure.current?.querySelector("summary")?.focus(); } }}>
    <summary aria-labelledby={id} aria-disabled={disabled} onClick={event => { if (disabled) event.preventDefault(); }}><span>{choices.find(choice => choice.value === value)?.label || value}</span><svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg></summary>
    <div className="state-dropdown-options" role="group" aria-labelledby={id}>{choices.map(({ value: state, label: optionLabel }) => <button type="button" key={state} disabled={disabled} aria-pressed={state === value} onClick={() => { if (disclosure.current) disclosure.current.open = false; disclosure.current?.querySelector("summary")?.focus(); onChange(state); }}><span>{optionLabel}</span><span aria-hidden="true">{state === value ? "✓" : ""}</span></button>)}</div>
  </details></div>;
}
