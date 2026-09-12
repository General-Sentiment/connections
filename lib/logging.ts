import { ZodError } from "zod";

export type ErrorContext = {
  event: string;
  route: string;
  method?: string;
  status?: number;
};

// Only pass static operation names and route templates. Never log request bodies,
// headers, query strings, upstream responses, or arbitrary error messages/causes.
export function logServerError(error: unknown, context: ErrorContext) {
  const errorType = error instanceof ZodError ? "ValidationError"
    : error instanceof TypeError ? "TypeError"
    : error instanceof SyntaxError ? "SyntaxError"
    : error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name) ? error.name
    : error instanceof Error ? "Error" : "UnknownError";
  // Keep source locations for diagnosis without the message or function arguments.
  const frames = error instanceof Error ? error.stack?.split("\n").slice(1)
    .flatMap(line => line.match(/[/\\]([\w.\[\]-]+\.(?:[cm]?js|tsx?):\d+:\d+)\)?$/)?.[1] ?? [])
    .slice(0, 8) : undefined;
  console.error(JSON.stringify({
    app: "connections", level: "error", timestamp: new Date().toISOString(),
    event: context.event, route: context.route.split(/[?#]/, 1)[0],
    method: context.method, status: context.status, errorType, frames,
  }));
}
