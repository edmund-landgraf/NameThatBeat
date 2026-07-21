import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { MAX_POINTS, MAX_WRONG_GUESSES, scoreForWrongGuesses } from "@/lib/game/scoring";

export type ScoreSubmission = {
  setId: string;
  trackId: string;
  wrongGuesses: number;
  skipped?: boolean;
  namedByText?: boolean;
  selectedChoiceId?: string | null;
  genre?: string;
  difficulty?: string;
};

export type ScoreRecord = {
  id: string;
  at: string;
  setId: string;
  trackId: string;
  wrongGuesses: number;
  skipped: boolean;
  namedByText: boolean;
  selectedChoiceId: string | null;
  points: number;
  genre: string | null;
  difficulty: string | null;
};

const scorePath = path.join(process.cwd(), ".local", "scores.json");

export function computeRoundPoints(input: {
  wrongGuesses: number;
  skipped?: boolean;
}) {
  if (input.skipped) {
    return 0;
  }

  const wrongGuesses = Math.max(0, Math.floor(input.wrongGuesses));
  if (wrongGuesses >= MAX_WRONG_GUESSES) {
    return 0;
  }

  return scoreForWrongGuesses(wrongGuesses);
}

export async function recordScoreSubmission(input: ScoreSubmission) {
  if (!input.setId?.trim() || !input.trackId?.trim()) {
    throw new Error("setId and trackId are required.");
  }

  if (!Number.isFinite(input.wrongGuesses) || input.wrongGuesses < 0) {
    throw new Error("wrongGuesses must be a non-negative number.");
  }

  const points = computeRoundPoints({
    wrongGuesses: input.wrongGuesses,
    skipped: input.skipped
  });

  const record: ScoreRecord = {
    id: `score_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
    at: new Date().toISOString(),
    setId: input.setId,
    trackId: input.trackId,
    wrongGuesses: Math.floor(input.wrongGuesses),
    skipped: Boolean(input.skipped),
    namedByText: Boolean(input.namedByText),
    selectedChoiceId: input.selectedChoiceId ?? null,
    points,
    genre: input.genre ?? null,
    difficulty: input.difficulty ?? null
  };

  const existing = await readScoreLog();
  existing.unshift(record);
  await writeScoreLog(existing.slice(0, 500));

  return {
    record,
    maxPoints: MAX_POINTS,
    valid: true
  };
}

async function readScoreLog(): Promise<ScoreRecord[]> {
  try {
    const raw = await readFile(scorePath, "utf8");
    const parsed = JSON.parse(raw) as { scores?: ScoreRecord[] };
    return parsed.scores ?? [];
  } catch {
    return [];
  }
}

async function writeScoreLog(scores: ScoreRecord[]) {
  await mkdir(path.dirname(scorePath), { recursive: true });
  await writeFile(scorePath, JSON.stringify({ scores }, null, 2), "utf8");
}
