import {
  getApprovedSourceUrl,
  getCatalogTracks,
  getPlaybackMethod,
  getTrackArtistName,
  getTrackLabel,
  loadMergedCatalog
} from "@/lib/catalog/load-catalog";
import type {
  AnswerChoice,
  SeedDifficulty,
  SeedTrack,
  SoloGameSet,
  SoloRoundTrack,
  SoloSetSource
} from "@/lib/catalog/types";
import { CHOICE_COUNT, TARGET_SET_SIZE } from "@/lib/game/scoring";
import { shuffle } from "@/lib/game/shuffle";
import { buildGeneratedWindows, windowsFromSeedPlan } from "@/lib/game/windows";
import {
  resolveSoundCloudTrackByQuery,
  searchPlayableTracks,
  type ResolvedSoundCloudTrack
} from "@/lib/soundcloud-resolve";

type BuildSoloSetInput = {
  genre: string;
  difficulty: SeedDifficulty;
  token: string | null;
  setSize?: number;
};

export class SoloSetError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "SoloSetError";
    this.status = status;
    this.code = code;
  }
}

export async function buildSoloGameSet({
  genre,
  difficulty,
  token,
  setSize = TARGET_SET_SIZE
}: BuildSoloSetInput): Promise<SoloGameSet> {
  const normalizedGenre = genre.trim().toLowerCase();
  const catalog = await loadMergedCatalog();
  const catalogPool = await getCatalogTracks(normalizedGenre, difficulty);
  const allCatalogTracks = catalog.tracks;
  const warnings: string[] = [];

  if (catalogPool.length === 0) {
    throw new SoloSetError(
      `No seed tracks found for ${normalizedGenre} / ${difficulty}.`,
      404,
      "empty_catalog"
    );
  }

  const playableRounds: SoloRoundTrack[] = [];
  const shuffledTargets = shuffle(catalogPool);

  for (const seedTrack of shuffledTargets) {
    if (playableRounds.length >= setSize) {
      break;
    }

    const resolved = await resolveSeedPlayback(seedTrack, token);

    if (!resolved) {
      continue;
    }

    const choices = buildChoices(seedTrack, allCatalogTracks, CHOICE_COUNT);

    playableRounds.push({
      id: seedTrack.id,
      label: getTrackLabel(seedTrack),
      title: seedTrack.work,
      artistName: getTrackArtistName(seedTrack),
      genre: seedTrack.genre,
      difficulty: seedTrack.difficulty,
      decade: seedTrack.decade ?? null,
      era: seedTrack.era ?? null,
      prePlayClue: buildPrePlayClue(seedTrack),
      sourceUrl: resolved.sourceUrl,
      playbackMethod: resolved.playbackMethod,
      durationSeconds: resolved.durationSeconds,
      access: resolved.access,
      discoverySource: resolved.discoverySource,
      narrativeHints: buildSeedHints(seedTrack),
      chunkWindows: resolved.chunkWindows,
      choices
    });
  }

  if (playableRounds.length < setSize && token) {
    const liveRounds = await buildLiveFallbackRounds({
      genre: normalizedGenre,
      difficulty,
      token,
      needed: setSize - playableRounds.length,
      existingIds: new Set(playableRounds.map((round) => round.id)),
      distractorPool: allCatalogTracks
    });

    if (liveRounds.length > 0) {
      playableRounds.push(...liveRounds);
      warnings.push(
        `Filled ${liveRounds.length} round(s) from live SoundCloud search because seed audio was unavailable.`
      );
    }
  }

  if (playableRounds.length === 0) {
    throw new SoloSetError(
      token
        ? `Could not resolve playable audio for ${normalizedGenre} / ${difficulty}. Try another genre or reconnect SoundCloud.`
        : `No approved seed audio is available for ${normalizedGenre} / ${difficulty}. Connect SoundCloud to resolve catalog tracks, or pick a genre with approved preview sources.`,
      422,
      "no_playable_rounds"
    );
  }

  const rounds = playableRounds.slice(0, setSize);
  const isReducedSet = rounds.length < setSize;
  const source = classifySetSource(rounds);

  if (isReducedSet) {
    warnings.unshift(
      `Reduced set: only ${rounds.length} of ${setSize} tracks have verified playable audio` +
        (token
          ? "."
          : ". Connect SoundCloud to resolve more catalog tracks.")
    );
  }

  return {
    setId: `solo_${normalizedGenre}_${difficulty}_${Date.now()}`,
    mode: "solo",
    genre: normalizedGenre,
    difficulty,
    choiceCount: CHOICE_COUNT,
    trackCount: rounds.length,
    targetTrackCount: setSize,
    isReducedSet,
    source,
    warnings,
    rounds
  };
}

async function resolveSeedPlayback(seedTrack: SeedTrack, token: string | null) {
  const approved = getApprovedSourceUrl(seedTrack);

  if (approved) {
    const seedWindows = windowsFromSeedPlan(seedTrack.chunk_plan);
    const durationSeconds = approved.duration_seconds ?? estimateDurationFromChunks(seedWindows);
    const playbackMethod = getPlaybackMethod(seedTrack);
    const discoverySource =
      seedTrack.id.startsWith("harvest_") || approved.source_name === "internet_archive"
        ? ("harvest" as const)
        : ("seed_url" as const);

    return {
      sourceUrl: approved.track_url,
      durationSeconds,
      access: discoverySource === "harvest" ? ("harvest_stream" as const) : ("seed" as const),
      discoverySource,
      playbackMethod,
      chunkWindows:
        seedWindows.length > 0
          ? seedWindows
          : buildGeneratedWindows(durationSeconds, hashString(seedTrack.id))
    };
  }

  if (!token) {
    return null;
  }

  const query = seedTrack.search_query ?? `${getTrackArtistName(seedTrack)} ${seedTrack.work}`;
  const resolved = await resolveSoundCloudTrackByQuery(query, token, {
    titles: [seedTrack.work, seedTrack.display_title, seedTrack.movement ?? ""].filter(Boolean),
    artists: [seedTrack.composer ?? "", seedTrack.artist ?? ""].filter(Boolean)
  });

  if (!resolved) {
    return null;
  }

  return {
    sourceUrl: resolved.sourceUrl,
    durationSeconds: resolved.durationSeconds,
    access: resolved.access,
    discoverySource: "seed_search" as const,
    playbackMethod: "soundcloud_widget" as const,
    chunkWindows: resolved.chunkWindows
  };
}

async function buildLiveFallbackRounds({
  genre,
  difficulty,
  token,
  needed,
  existingIds,
  distractorPool
}: {
  genre: string;
  difficulty: SeedDifficulty;
  token: string;
  needed: number;
  existingIds: Set<string>;
  distractorPool: SeedTrack[];
}) {
  if (needed <= 0) {
    return [] as SoloRoundTrack[];
  }

  const liveTracks = await searchPlayableTracks(genre, token, 50);
  const selected = shuffle(liveTracks)
    .filter((track) => !existingIds.has(track.id))
    .slice(0, needed);

  return selected.map((track) => mapLiveRound(track, genre, difficulty, distractorPool));
}

function mapLiveRound(
  track: ResolvedSoundCloudTrack,
  genre: string,
  difficulty: SeedDifficulty,
  distractorPool: SeedTrack[]
): SoloRoundTrack {
  const label = `${track.artistName} - ${track.title}`;
  const syntheticSeed: SeedTrack = {
    id: track.id,
    display_title: label,
    work: track.title,
    genre,
    difficulty,
    audio_source_status: "live_search",
    chunk_plan: [],
    artist: track.artistName
  };

  return {
    id: track.id,
    label,
    title: track.title,
    artistName: track.artistName,
    genre,
    difficulty,
    decade: null,
    era: track.genre,
    prePlayClue: `Live SoundCloud find · genre hint: ${genre}`,
    sourceUrl: track.sourceUrl,
    playbackMethod: "soundcloud_widget",
    durationSeconds: track.durationSeconds,
    access: track.access,
    discoverySource: "live_search",
    narrativeHints: [
      track.genre ? `The SoundCloud genre is ${track.genre}.` : null,
      track.tagList ? `Tags include related style cues.` : null
    ].filter((hint): hint is string => Boolean(hint)),
    chunkWindows: track.chunkWindows,
    choices: buildChoices(syntheticSeed, distractorPool, CHOICE_COUNT, [
      { id: track.id, label }
    ])
  };
}

function buildChoices(
  correctTrack: SeedTrack,
  pool: SeedTrack[],
  choiceCount: number,
  forcedChoices: AnswerChoice[] = []
): AnswerChoice[] {
  const correctChoice = forcedChoices[0] ?? {
    id: correctTrack.id,
    label: getTrackLabel(correctTrack)
  };

  const others = pool.filter(
    (track) => track.id !== correctTrack.id && track.id !== correctChoice.id
  );
  const sameGenre = shuffle(others.filter((track) => track.genre === correctTrack.genre));
  const crossGenre = shuffle(others.filter((track) => track.genre !== correctTrack.genre));
  const isHarvest = correctTrack.id.startsWith("harvest_");

  // Harvested / harder rounds keep mostly same-genre distractors so the ear does the work.
  // Easy curated rounds still mix in cross-genre, but reserve several same-genre traps.
  let preferred: SeedTrack[];
  if (isHarvest || correctTrack.difficulty !== "easy") {
    preferred = [...sameGenre, ...crossGenre];
  } else {
    const sameSlots = Math.min(3, sameGenre.length);
    const crossSlots = Math.max(0, choiceCount - 1 - sameSlots);
    preferred = [...crossGenre.slice(0, crossSlots), ...sameGenre, ...crossGenre.slice(crossSlots)];
  }

  const distractors = preferred.slice(0, Math.max(0, choiceCount - 1)).map((track) => ({
    id: track.id,
    label: getTrackLabel(track)
  }));

  const choices = shuffle([correctChoice, ...distractors]);

  if (choices.length < choiceCount) {
    return choices;
  }

  return choices.slice(0, choiceCount);
}

function classifySetSource(rounds: SoloRoundTrack[]): SoloSetSource {
  const sources = new Set(rounds.map((round) => round.discoverySource));
  const hasHarvest = sources.has("harvest");
  const hasLive = sources.has("live_search");
  const hasCatalog = sources.has("seed_url") || sources.has("seed_search");

  const kindCount = [hasHarvest, hasLive, hasCatalog].filter(Boolean).length;
  if (kindCount > 1) {
    return "mixed";
  }

  if (hasHarvest) {
    return "harvest";
  }

  if (hasLive) {
    return "live";
  }

  return "catalog";
}

function buildPrePlayClue(track: SeedTrack) {
  const parts = [
    track.genre ? `Genre: ${track.genre}` : null,
    track.decade ? `Decade: ${track.decade}` : track.era ? `Era: ${track.era}` : null,
    track.difficulty ? `Difficulty: ${track.difficulty}` : null
  ].filter(Boolean);

  return parts.join(" · ");
}

function buildSeedHints(track: SeedTrack) {
  return [
    track.decade ? `This track is associated with the ${track.decade}.` : null,
    track.era ? `Era/style: ${track.era}.` : null,
    track.recognition_notes ?? null
  ].filter((hint): hint is string => Boolean(hint));
}

function estimateDurationFromChunks(windows: Array<{ startSeconds: number; durationSeconds: number }>) {
  if (windows.length === 0) {
    return 180;
  }

  const maxEnd = Math.max(...windows.map((window) => window.startSeconds + window.durationSeconds));
  return Math.max(180, maxEnd + 30);
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash || 1;
}
