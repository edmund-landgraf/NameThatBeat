export const MAX_POINTS = 100;
export const CHOICE_COUNT = 8;
export const MAX_WRONG_GUESSES = 7;
export const POINTS_PER_WRONG = 15;
export const TARGET_SET_SIZE = 5;

/** Max window length and spacing used when generating candidate start offsets. */
export const CHUNK_SECONDS = 10;

/**
 * Progressive clip lengths for Milestone 1 / NTT-feel scarcity.
 * First play is short (2s within the 1–3s band); later plays grow toward a full chunk.
 */
export const CLIP_DURATION_LADDER_SECONDS = [2, 3, 5, 7, 10] as const;

export function clipDurationForPlayIndex(playIndex: number) {
  const ladder = CLIP_DURATION_LADDER_SECONDS;
  const safeIndex = Math.max(0, Math.min(playIndex, ladder.length - 1));
  return ladder[safeIndex];
}

export function scoreForWrongGuesses(wrongGuesses: number) {
  if (wrongGuesses >= MAX_WRONG_GUESSES) {
    return 0;
  }

  return Math.max(0, MAX_POINTS - wrongGuesses * POINTS_PER_WRONG);
}

/** Free-text correct answers keep full remaining score (no MC penalty). */
export function scoreForFreeTextGuess(wrongGuesses: number) {
  return scoreForWrongGuesses(wrongGuesses);
}
