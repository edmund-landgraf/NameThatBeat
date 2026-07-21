import { describe, expect, it } from "vitest";

import { computeRoundPoints } from "@/lib/game/score-log";

describe("computeRoundPoints", () => {
  it("returns 0 for skips", () => {
    expect(computeRoundPoints({ wrongGuesses: 0, skipped: true })).toBe(0);
  });

  it("matches client scoring ladder", () => {
    expect(computeRoundPoints({ wrongGuesses: 0 })).toBe(100);
    expect(computeRoundPoints({ wrongGuesses: 1 })).toBe(85);
    expect(computeRoundPoints({ wrongGuesses: 7 })).toBe(0);
  });
});
