import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../app/api/auth/callback/route";

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), me: vi.fn(), discover: vi.fn() }));
vi.mock("../lib/session", () => ({ getSession: mocks.getSession }));
vi.mock("../lib/config", () => ({ appUrl: () => "https://connections.test" }));
vi.mock("../lib/arena", () => ({ ArenaClient: class { me = mocks.me; } }));
vi.mock("../lib/conversations", () => ({ discoverConversations: mocks.discover }));

beforeEach(() => {
  mocks.getSession.mockResolvedValue({ oauth: { state: "secret-state", created: Date.now(), verifier: "secret-verifier", next: "/" }, save: vi.fn() });
  mocks.me.mockResolvedValue({ id: 1, name: "Private Name" });
  mocks.discover.mockResolvedValue(undefined);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const request = () => new NextRequest("https://connections.test/api/auth/callback?state=secret-state&code=secret-code");

it("logs rejected token exchange with upstream status and preserves login redirect", async () => {
  const output = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private response", { status: 401 })));
  const response = await GET(request());
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toContain("error=");
  expect(JSON.parse(output.mock.calls[0][0])).toMatchObject({ event: "auth.token_exchange_failed", status: 401 });
  expect(JSON.stringify(output.mock.calls)).not.toMatch(/secret|private response/);
});

it("logs invalid login state without exchanging the code", async () => {
  const output = vi.spyOn(console, "error").mockImplementation(() => {});
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  await GET(new NextRequest("https://connections.test/api/auth/callback?state=wrong"));
  expect(fetch).not.toHaveBeenCalled();
  expect(JSON.parse(output.mock.calls[0][0]).event).toBe("auth.invalid_state");
});

it("logs optional discovery failure while completing login", async () => {
  const output = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ access_token: "secret-token" })));
  mocks.discover.mockRejectedValue(new Error("private conversation"));
  const response = await GET(request());
  expect(response.headers.get("location")).toBe("https://connections.test/?intro=skip");
  expect(JSON.parse(output.mock.calls[0][0]).event).toBe("auth.conversation_discovery_failed");
  expect(JSON.stringify(output.mock.calls)).not.toMatch(/secret|Private Name|private conversation/);
});
