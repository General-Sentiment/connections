"use client";
import { useEffect, useRef } from "react";
type Tool = { name: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: (input: unknown) => unknown | Promise<unknown> };
export function useWebMCP(tools: Tool[]) {
  const current = useRef(tools); current.current = tools;
  const names = tools.map(x => x.name).join(",");
  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: Tool, options: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    for (const tool of current.current) {
      try { void Promise.resolve(context.registerTool({ ...tool, execute: input => current.current.find(x => x.name === tool.name)!.execute(input) }, { signal: controller.signal })).catch(() => undefined); } catch { /* Optional browser capability. */ }
    }
    return () => controller.abort();
  }, [names]);
}
