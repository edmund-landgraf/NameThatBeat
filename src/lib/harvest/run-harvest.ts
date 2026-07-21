import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { SeedCatalog, SeedDifficulty, SeedTrack } from "@/lib/catalog/types";
import { buildGeneratedWindows, formatTime } from "@/lib/game/windows";
import { shuffle } from "@/lib/game/shuffle";
import { searchInternetArchiveAudio } from "@/lib/providers/internet-archive";
import type { ProviderTrack } from "@/lib/providers/types";

export type HarvestRequest = {
  genre: string;
  difficulty?: SeedDifficulty;
  count?: number;
  queryBoosts?: string[];
  minDurationSeconds?: number;
  maxDurationSeconds?: number;
  windowsPerTrack?: number;
};

export type HarvestRunResult = {
  runId: string;
  genre: string;
  fetched: number;
  accepted: number;
  rejected: number;
  activePath: string;
  runPath: string;
  tracks: SeedTrack[];
  warnings: string[];
};

const harvestRoot = path.join(process.cwd(), ".local", "harvest");
const activeCatalogPath = path.join(harvestRoot, "active.json");

export async function runInternetArchiveHarvest(
  request: HarvestRequest
): Promise<HarvestRunResult> {
  const genre = request.genre.trim().toLowerCase() || "classical";
  const difficulty = request.difficulty ?? "easy";
  const count = clamp(request.count ?? 8, 1, 20);
  const windowsPerTrack = clamp(request.windowsPerTrack ?? 6, 3, 8);
  const minDurationSeconds = request.minDurationSeconds ?? 60;
  const maxDurationSeconds = request.maxDurationSeconds ?? 900;
  const boosts = request.queryBoosts?.filter(Boolean) ?? defaultBoosts(genre);
  const query = [`(${genre})`, ...boosts.map((boost) => `(${boost})`)].join(" OR ");

  const runId = `harvest_${genre}_${Date.now()}`;
  const warnings: string[] = [];

  await mkdir(harvestRoot, { recursive: true });

  const providerTracks = await searchInternetArchiveAudio({
    query,
    rows: Math.max(30, count * 4),
    minDurationSeconds,
    maxDurationSeconds
  });

  const existing = await readActiveHarvestCatalog();
  const existingIds = new Set(existing.tracks.map((track) => track.id));

  const acceptedProviderTracks = shuffle(providerTracks)
    .filter((track) => track.qualityScore >= 0.55)
    .filter((track) => !existingIds.has(seedIdForProvider(track)))
    .filter((track) => !track.genre || track.genre === genre || genreMatchesLoose(track, genre))
    .slice(0, count);

  const rejected = Math.max(0, providerTracks.length - acceptedProviderTracks.length);
  const seedTracks = acceptedProviderTracks.map((track) =>
    providerToSeedTrack(track, genre, difficulty, windowsPerTrack)
  );

  if (seedTracks.length === 0) {
    warnings.push(
      "No new Internet Archive tracks passed rights/duration/quality filters. Try another genre or broader boosts."
    );
  }

  const mergedTracks = dedupeTracks([...seedTracks, ...existing.tracks]).slice(0, 200);
  const activeCatalog: SeedCatalog = {
    seed_name: "harvested_active",
    version: (existing.version ?? 0) + 1,
    notes: "Auto-harvested CC/PD audio from Internet Archive. Streamed via HTML5; do not rehost commercially without checking license.",
    tracks: mergedTracks
  };

  await writeFile(activeCatalogPath, JSON.stringify(activeCatalog, null, 2), "utf8");

  const runPath = path.join(harvestRoot, `${runId}.json`);
  await writeFile(
    runPath,
    JSON.stringify(
      {
        runId,
        genre,
        difficulty,
        query,
        fetched: providerTracks.length,
        accepted: seedTracks.length,
        rejected,
        createdAt: new Date().toISOString(),
        tracks: seedTracks
      },
      null,
      2
    ),
    "utf8"
  );

  return {
    runId,
    genre,
    fetched: providerTracks.length,
    accepted: seedTracks.length,
    rejected,
    activePath: activeCatalogPath,
    runPath,
    tracks: seedTracks,
    warnings
  };
}

export async function readActiveHarvestCatalog(): Promise<SeedCatalog> {
  try {
    const raw = await readFile(activeCatalogPath, "utf8");
    return JSON.parse(raw) as SeedCatalog;
  } catch {
    return {
      seed_name: "harvested_active",
      version: 0,
      tracks: []
    };
  }
}

function providerToSeedTrack(
  track: ProviderTrack,
  genre: string,
  difficulty: SeedDifficulty,
  windowsPerTrack: number
): SeedTrack {
  const windows = buildGeneratedWindows(track.durationSeconds, hashString(track.providerTrackId), windowsPerTrack);

  return {
    id: seedIdForProvider(track),
    composer: null,
    artist: track.artistName,
    display_title: `${track.artistName} - ${track.title}`,
    work: track.title,
    movement: null,
    genre: track.genre ?? genre,
    difficulty,
    era: null,
    decade: null,
    search_query: `${track.artistName} ${track.title}`,
    recognition_notes: track.attributionText,
    audio_source_status: "source_url_available",
    audio_sources: [
      {
        source_name: "internet_archive",
        track_url: track.sourceUrl,
        playback_method: "html5_stream",
        can_stream: true,
        can_cache: false,
        duration_seconds: track.durationSeconds
      }
    ],
    chunk_plan: windows.map((window, index) => ({
      order: index + 1,
      start_seconds: window.startSeconds,
      duration_seconds: window.durationSeconds,
      hint: `${formatTime(window.startSeconds)}-${formatTime(window.startSeconds + window.durationSeconds)}`
    }))
  };
}

function seedIdForProvider(track: ProviderTrack) {
  return `harvest_ia_${track.providerTrackId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80)}`;
}

function defaultBoosts(genre: string) {
  switch (genre) {
    case "classical":
      return ["orchestra", "symphony", "piano"];
    case "jazz":
      return ["jazz", "swing", "blues"];
    case "rock":
      return ["rock", "guitar"];
    case "pop":
      return ["pop", "song"];
    default:
      return [genre];
  }
}

function genreMatchesLoose(track: ProviderTrack, genre: string) {
  const haystack = `${track.title} ${track.artistName} ${track.attributionText}`.toLowerCase();
  return haystack.includes(genre);
}

function dedupeTracks(tracks: SeedTrack[]) {
  const seen = new Set<string>();
  const result: SeedTrack[] = [];

  for (const track of tracks) {
    if (seen.has(track.id)) {
      continue;
    }

    seen.add(track.id);
    result.push(track);
  }

  return result;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash || 1;
}
