import type { SoloRoundTrack } from "@/lib/catalog/types";

/**
 * Normalize a player guess or catalog string for free-text title matching.
 */
export function normalizeTitleGuess(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripMovementSuffix(value: string) {
  return value
    .replace(/\b(i{1,3}|iv|v|vi{0,3}|ix|x)\.\s+.+$/i, "")
    .replace(/\bop\.?\s*\d+.*$/i, "")
    .replace(/\bk\.?\s*\d+.*$/i, "")
    .replace(/\bbwv\s*\d+.*$/i, "")
    .trim();
}

export function buildAcceptedTitleAliases(track: SoloRoundTrack): string[] {
  const raw = [
    track.title,
    track.label,
    track.label.includes(" - ") ? track.label.split(" - ").slice(1).join(" - ") : null,
    `${track.artistName} ${track.title}`,
    stripMovementSuffix(track.title),
    stripMovementSuffix(
      track.label.includes(" - ") ? track.label.split(" - ").slice(1).join(" - ") : track.title
    )
  ];

  const aliases = new Set<string>();

  for (const entry of raw) {
    if (!entry) {
      continue;
    }

    const normalized = normalizeTitleGuess(entry);
    if (normalized.length >= 3) {
      aliases.add(normalized);
    }

    const stripped = normalizeTitleGuess(stripMovementSuffix(entry));
    if (stripped.length >= 3) {
      aliases.add(stripped);
    }
  }

  return [...aliases];
}

export function isCorrectTitleGuess(guess: string, track: SoloRoundTrack) {
  const normalizedGuess = normalizeTitleGuess(guess);

  if (normalizedGuess.length < 2) {
    return false;
  }

  const aliases = buildAcceptedTitleAliases(track);

  if (aliases.some((alias) => alias === normalizedGuess)) {
    return true;
  }

  // Allow close matches and "contains distinctive title" for longer works.
  return aliases.some((alias) => {
    if (alias.length >= 8 && (alias.includes(normalizedGuess) || normalizedGuess.includes(alias))) {
      const shorter = Math.min(alias.length, normalizedGuess.length);
      const longer = Math.max(alias.length, normalizedGuess.length);
      return shorter / longer >= 0.72;
    }

    return levenshtein(alias, normalizedGuess) <= maxEditDistance(alias);
  });
}

function maxEditDistance(alias: string) {
  if (alias.length <= 5) {
    return 1;
  }

  if (alias.length <= 12) {
    return 2;
  }

  return 3;
}

function levenshtein(a: string, b: string) {
  if (a === b) {
    return 0;
  }

  if (a.length === 0) {
    return b.length;
  }

  if (b.length === 0) {
    return a.length;
  }

  const previous = new Array<number>(b.length + 1);
  const current = new Array<number>(b.length + 1);

  for (let j = 0; j <= b.length; j += 1) {
    previous[j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }

    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
}
