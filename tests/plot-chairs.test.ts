import { expect, it } from "vitest";
import { assignPlotChairs } from "../lib/plot-chairs";
const pairs = Array.from({ length: 12 }, (_, i) => ({ first: { user_id: i * 2 + 1 }, second: { user_id: i * 2 + 2 } }));
it("seats ten pairs in twenty distinct adjacent chairs", () => {
  const assigned = assignPlotChairs(pairs, []);
  expect(assigned.slice(0, 10).flatMap(pair => [pair.first.chair, pair.second.chair])).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  expect(assigned.slice(10).every(pair => !pair.first.chair && !pair.second.chair)).toBe(true);
});
it("prioritizes people who missed chairs in earlier rounds", () => {
  const first = assignPlotChairs(pairs, []);
  const second = assignPlotChairs(pairs, [{ pairs: first }]);
  expect(second.slice(0, 2).map(pair => pair.first.user_id)).toEqual([21, 23]);
  const third = assignPlotChairs(pairs, [{ pairs: first }, { pairs: second }]);
  expect(third.slice(0, 2).map(pair => pair.first.user_id)).toEqual([17, 19]);
});
it("does not give the same person two chairs in an odd attendance round", () => {
  const assigned = assignPlotChairs([{ first: { user_id: 1 }, second: { user_id: 2 } }, { first: { user_id: 1 }, second: { user_id: 3 } }], []);
  expect(assigned[0].first.chair).toBe(1);
  expect(assigned[1].first.chair).toBeUndefined();
});
