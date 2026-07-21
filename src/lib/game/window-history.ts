const STORAGE_KEY = "ntb_audio_windows_v1";

export type StoredWindowRange = {
  startSeconds: number;
  endSeconds: number;
  at: number;
};

type WindowHistory = Record<string, StoredWindowRange[]>;

function readHistory(): WindowHistory {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    return JSON.parse(raw) as WindowHistory;
  } catch {
    return {};
  }
}

function writeHistory(history: WindowHistory) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function getUsedWindows(sourceUrl: string): StoredWindowRange[] {
  return readHistory()[sourceUrl] ?? [];
}

export function recordUsedWindow(sourceUrl: string, startSeconds: number, durationSeconds: number) {
  const history = readHistory();
  const existing = history[sourceUrl] ?? [];
  const nextEntry: StoredWindowRange = {
    startSeconds,
    endSeconds: startSeconds + durationSeconds,
    at: Date.now()
  };

  history[sourceUrl] = [...existing, nextEntry].slice(-40);
  writeHistory(history);
}
