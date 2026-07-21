const STORAGE_KEY = "ntb_solo_stats_v1";

export type SoloLocalStats = {
  currentStreak: number;
  bestStreak: number;
  highScore: number;
  setsPlayed: number;
  lastSetScore: number;
  updatedAt: string | null;
};

const emptyStats: SoloLocalStats = {
  currentStreak: 0,
  bestStreak: 0,
  highScore: 0,
  setsPlayed: 0,
  lastSetScore: 0,
  updatedAt: null
};

export function readSoloStats(): SoloLocalStats {
  if (typeof window === "undefined") {
    return { ...emptyStats };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...emptyStats };
    }

    return { ...emptyStats, ...(JSON.parse(raw) as Partial<SoloLocalStats>) };
  } catch {
    return { ...emptyStats };
  }
}

export function recordSoloSetFinish(totalScore: number): SoloLocalStats {
  const previous = readSoloStats();
  const continued = totalScore > 0;
  const currentStreak = continued ? previous.currentStreak + 1 : 0;
  const next: SoloLocalStats = {
    currentStreak,
    bestStreak: Math.max(previous.bestStreak, currentStreak),
    highScore: Math.max(previous.highScore, totalScore),
    setsPlayed: previous.setsPlayed + 1,
    lastSetScore: totalScore,
    updatedAt: new Date().toISOString()
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return next;
}
