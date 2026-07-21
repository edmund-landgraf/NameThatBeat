export type SeedDifficulty = "easy" | "medium" | "hard";

export type SeedChunkPlan = {
  order: number;
  duration_seconds: number;
  hint?: string;
  start_seconds?: number;
};

export type SeedAudioSource = {
  source_name: string;
  track_url: string;
  playback_method?: string;
  target_bitrate_kbps?: number;
  can_stream?: boolean;
  can_cache?: boolean;
  duration_seconds?: number;
};

export type SeedTrack = {
  id: string;
  composer?: string | null;
  artist?: string | null;
  display_title: string;
  work: string;
  movement?: string | null;
  genre: string;
  difficulty: SeedDifficulty;
  era?: string | null;
  decade?: string | null;
  search_query?: string;
  recognition_notes?: string;
  audio_source_status: string;
  audio_sources?: SeedAudioSource[];
  chunk_plan: SeedChunkPlan[];
};

export type SeedCatalog = {
  seed_name: string;
  version: number;
  notes?: string;
  tracks: SeedTrack[];
};

export type GameTrackWindow = {
  startSeconds: number;
  durationSeconds: number;
  label: string;
};

export type AnswerChoice = {
  id: string;
  label: string;
};

export type SoloRoundTrack = {
  id: string;
  label: string;
  title: string;
  artistName: string;
  genre: string;
  difficulty: SeedDifficulty;
  decade: string | null;
  era: string | null;
  /** Safe clue shown before audio (no title spoilers). */
  prePlayClue: string;
  sourceUrl: string;
  playbackMethod: "soundcloud_widget" | "html5_stream";
  durationSeconds: number;
  access: "playable" | "preview" | "seed" | "harvest_stream";
  discoverySource: "seed_url" | "seed_search" | "live_search" | "harvest";
  narrativeHints: string[];
  chunkWindows: GameTrackWindow[];
  choices: AnswerChoice[];
};

export type SoloSetSource = "catalog" | "harvest" | "live" | "mixed";

export type SoloGameSet = {
  setId: string;
  mode: "solo";
  genre: string;
  difficulty: SeedDifficulty;
  choiceCount: 8;
  trackCount: number;
  targetTrackCount: number;
  /** True when fewer playable rounds were found than targetTrackCount. */
  isReducedSet: boolean;
  source: SoloSetSource;
  warnings: string[];
  rounds: SoloRoundTrack[];
};
