type Member = { user_id: number; chair?: number };
type Pair = { first: Member; second: Member };
export function assignPlotChairs<T extends Pair>(pairs: T[], previous: { pairs: Pair[] }[]): (T & Pair)[] {
  const counts = new Map<number, number>();
  for (const round of previous) {
    const seated = new Set(round.pairs.flatMap(pair => [pair.first, pair.second]).filter(person => person.chair !== undefined).map(person => person.user_id));
    for (const id of seated) counts.set(id, (counts.get(id) || 0) + 1);
  }
  const count = (person: Member) => counts.get(person.user_id) || 0;
  const ordered = [...pairs].sort((a, b) =>
    Number(count(b.first) === 0) + Number(count(b.second) === 0) - Number(count(a.first) === 0) - Number(count(a.second) === 0) ||
    count(a.first) + count(a.second) - count(b.first) - count(b.second));
  const seated = new Set<number>();
  let chair = 1;
  return ordered.map(pair => {
    if (chair > 19 || seated.has(pair.first.user_id) || seated.has(pair.second.user_id) || pair.first.user_id === pair.second.user_id) return pair;
    seated.add(pair.first.user_id); seated.add(pair.second.user_id);
    return { ...pair, first: { ...pair.first, chair: chair++ }, second: { ...pair.second, chair: chair++ } };
  });
}
