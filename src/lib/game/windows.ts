import type { GameTrackWindow, SeedChunkPlan } from "@/lib/catalog/types";
import { CHUNK_SECONDS } from "@/lib/game/scoring";

export function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function windowsFromSeedPlan(chunkPlan: SeedChunkPlan[]): GameTrackWindow[] {
  return chunkPlan
    .filter((chunk) => typeof chunk.start_seconds === "number")
    .sort((a, b) => a.order - b.order)
    .map((chunk) => {
      const startSeconds = chunk.start_seconds as number;
      const durationSeconds = chunk.duration_seconds || CHUNK_SECONDS;

      return {
        startSeconds,
        durationSeconds,
        label: chunk.hint ?? `${formatTime(startSeconds)}-${formatTime(startSeconds + durationSeconds)}`
      };
    });
}

export function buildGeneratedWindows(
  durationSeconds: number,
  seed: number,
  windowCount = 8
): GameTrackWindow[] {
  const safeDuration = Math.max(CHUNK_SECONDS, durationSeconds);
  const maxStart = Math.max(0, safeDuration - CHUNK_SECONDS);
  const lowerBound = safeDuration > 45 ? 10 : 0;
  const upperBound = safeDuration > 45 ? Math.max(lowerBound, maxStart - 10) : maxStart;
  const candidateStarts: number[] = [];

  for (let start = lowerBound; start <= upperBound; start += CHUNK_SECONDS) {
    candidateStarts.push(start);
  }

  if (candidateStarts.length === 0) {
    candidateStarts.push(0);
  }

  return shuffleDeterministic(candidateStarts, seed)
    .slice(0, Math.min(windowCount, candidateStarts.length))
    .map((startSeconds) => ({
      startSeconds,
      durationSeconds: CHUNK_SECONDS,
      label: `${formatTime(startSeconds)}-${formatTime(startSeconds + CHUNK_SECONDS)}`
    }));
}

export function filterNonOverlappingWindows(
  windows: GameTrackWindow[],
  usedRanges: Array<{ startSeconds: number; endSeconds: number }>
) {
  if (usedRanges.length === 0) {
    return windows;
  }

  const fresh = windows.filter((window) => {
    const endSeconds = window.startSeconds + window.durationSeconds;

    return !usedRanges.some((used) => rangesOverlap(window.startSeconds, endSeconds, used.startSeconds, used.endSeconds));
  });

  return fresh.length > 0 ? fresh : windows;
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

function shuffleDeterministic<T>(items: T[], seed: number) {
  const copy = [...items];
  let state = seed % 2147483647;

  if (state <= 0) {
    state += 2147483646;
  }

  for (let index = copy.length - 1; index > 0; index -= 1) {
    state = (state * 16807) % 2147483647;
    const swapIndex = state % (index + 1);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}
