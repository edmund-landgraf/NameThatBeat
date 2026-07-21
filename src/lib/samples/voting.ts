import { shuffle } from "@/lib/game/shuffle";
import type { SampleCandidate } from "@/lib/samples/types";

export function pickAbPair(candidates: SampleCandidate[], recentPairKeys: string[]) {
  if (candidates.length < 2) {
    return null;
  }

  const ranked = [...candidates].sort((a, b) => b.score - a.score || b.voteCount - a.voteCount);
  const top = ranked.slice(0, Math.min(4, ranked.length));

  for (let i = 0; i < top.length; i += 1) {
    for (let j = i + 1; j < top.length; j += 1) {
      const pair = shuffle([top[i], top[j]]);
      const key = pairKey(pair[0].id, pair[1].id);
      if (!recentPairKeys.includes(key)) {
        return { a: pair[0], b: pair[1], key };
      }
    }
  }

  const fallback = shuffle(ranked).slice(0, 2);
  return {
    a: fallback[0],
    b: fallback[1],
    key: pairKey(fallback[0].id, fallback[1].id)
  };
}

export function pairKey(aId: string, bId: string) {
  return [aId, bId].sort().join("::");
}
