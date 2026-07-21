import { describe, expect, it } from "vitest";

import type { SoloRoundTrack } from "@/lib/catalog/types";
import { isCorrectTitleGuess, normalizeTitleGuess } from "@/lib/game/title-match";

const sampleTrack: SoloRoundTrack = {
  id: "classical_vivaldi_four_seasons_summer",
  label: "Vivaldi - The Four Seasons: Summer",
  title: "The Four Seasons: Summer",
  artistName: "Antonio Vivaldi",
  genre: "classical",
  difficulty: "easy",
  decade: null,
  era: "baroque",
  prePlayClue: "Genre: classical · Era: baroque",
  sourceUrl: "https://example.com",
  playbackMethod: "html5_stream",
  durationSeconds: 500,
  access: "seed",
  discoverySource: "seed_url",
  narrativeHints: [],
  chunkWindows: [],
  choices: []
};

describe("normalizeTitleGuess", () => {
  it("strips punctuation and filler words", () => {
    expect(normalizeTitleGuess("The Four Seasons: Summer!")).toBe("four seasons summer");
  });
});

describe("isCorrectTitleGuess", () => {
  it("accepts title and composer+title forms", () => {
    expect(isCorrectTitleGuess("Four Seasons Summer", sampleTrack)).toBe(true);
    expect(isCorrectTitleGuess("Vivaldi - The Four Seasons: Summer", sampleTrack)).toBe(true);
  });

  it("rejects unrelated guesses", () => {
    expect(isCorrectTitleGuess("Billie Jean", sampleTrack)).toBe(false);
  });
});
