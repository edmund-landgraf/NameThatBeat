import { describe, expect, it } from "vitest";

import {
  CLIP_DURATION_LADDER_SECONDS,
  clipDurationForPlayIndex,
  scoreForFreeTextGuess,
  scoreForWrongGuesses
} from "@/lib/game/scoring";

describe("clipDurationForPlayIndex", () => {
  it("starts short and grows along the ladder", () => {
    expect(clipDurationForPlayIndex(0)).toBe(2);
    expect(clipDurationForPlayIndex(1)).toBe(3);
    expect(clipDurationForPlayIndex(4)).toBe(10);
    expect(clipDurationForPlayIndex(99)).toBe(CLIP_DURATION_LADDER_SECONDS.at(-1));
  });
});

describe("scoreForWrongGuesses", () => {
  it("awards full points with no misses", () => {
    expect(scoreForWrongGuesses(0)).toBe(100);
    expect(scoreForFreeTextGuess(0)).toBe(100);
  });

  it("drops by 15 per wrong guess and floors at 0", () => {
    expect(scoreForWrongGuesses(2)).toBe(70);
    expect(scoreForWrongGuesses(7)).toBe(0);
    expect(scoreForWrongGuesses(8)).toBe(0);
  });
});
