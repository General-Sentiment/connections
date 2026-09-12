import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { logServerError } from "../lib/logging";
import { apiError } from "../lib/http";
import { ArenaError } from "../lib/arena";
import { onRequestError } from "../instrumentation";

afterEach(() => vi.restoreAllMocks());

it("logs useful locations without arbitrary messages, causes, query strings, or extra context", () => {
  const output = vi.spyOn(console, "error").mockImplementation(() => {});
  const error = new Error("secret-token private message", { cause: { token: "secret-token" } });
  error.stack = "Error: secret-token\n    at saveProfile (/workspace/lib/profiles.ts:10:3)\n    at https://example.com/?token=secret-token";
  logServerError(error, { event: "api.failed", route: "/api/profile?token=secret-token", method: "POST", status: 400, body: "private message" } as Parameters<typeof logServerError>[1]);
  const line = output.mock.calls[0][0];
  expect(JSON.parse(line)).toMatchObject({ event: "api.failed", route: "/api/profile", method: "POST", frames: ["profiles.ts:10:3"] });
  expect(line).not.toContain("secret-token");
  expect(line).not.toContain("private message");
});

it("logs rate-limited API failures while preserving response and retry headers", async () => {
  const output = vi.spyOn(console, "error").mockImplementation(() => {});
  const response = apiError(new ArenaError(429, "Please retry.", "60"), { route: "/api/profile", method: "POST" });
  expect(response.status).toBe(429);
  expect(response.headers.get("Retry-After")).toBe("60");
  expect(await response.json()).toEqual({ error: "Please retry." });
  expect(JSON.parse(output.mock.calls[0][0])).toMatchObject({ event: "api.failed", status: 429, route: "/api/profile" });
});

it("does not log validation input or custom messages", () => {
  const output = vi.spyOn(console, "error").mockImplementation(() => {});
  const result = z.string().refine(() => false, "private message").safeParse("private input");
  if (result.success) throw new Error("Expected validation failure");
  apiError(result.error, { route: "/api/profile", method: "POST" });
  expect(JSON.parse(output.mock.calls[0][0]).errorType).toBe("ValidationError");
  expect(output.mock.calls[0][0]).not.toContain("private");
});

it("captures unhandled server failures using the route template, excluding request details", async () => {
  const output = vi.spyOn(console, "error").mockImplementation(() => {});
  await onRequestError(new Error("private message"), { path: "/people/private-id?code=secret", method: "GET", headers: { authorization: "secret" } }, {
    routerKind: "App Router", routePath: "/people/[id]", routeType: "render", revalidateReason: undefined,
  });
  expect(JSON.parse(output.mock.calls[0][0])).toMatchObject({ event: "server.unhandled_error", route: "/people/[id]" });
  expect(output.mock.calls[0][0]).not.toContain("secret");
  expect(output.mock.calls[0][0]).not.toContain("private");
});
