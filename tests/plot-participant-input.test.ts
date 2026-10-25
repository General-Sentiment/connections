import { expect, it } from "vitest";
import { normalizeParticipantName, normalizeParticipantCode } from "../lib/plot-participant-input";
it("normalizes name whitespace without changing chosen capitalization", () => {
  expect(normalizeParticipantName("  Maya\u00a0  Chen\n ")).toBe("Maya Chen");
  expect(normalizeParticipantName(" José  van der Meer ")).toBe("José van der Meer");
});
it("normalizes pasted participant codes and case", () => {
  expect(normalizeParticipantCode(" ABCD-EF. 123ABC\n")).toBe("abcd-ef.123abc");
});
