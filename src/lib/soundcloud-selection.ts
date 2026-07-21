export type GameTrackWindow = {
  startSeconds: number;
  durationSeconds: number;
  label: string;
};

export type SelectedGameTrack = {
  id: string;
  title: string;
  artistName: string;
  label: string;
  sourceUrl: string;
  discoverySource?: "track_search" | "playlist_search";
  playlistContext?: string | null;
  durationSeconds: number;
  access: "playable" | "preview";
  genre: string | null;
  tagList: string | null;
  description?: string | null;
  narrativeHints?: string[];
  chunkWindows: GameTrackWindow[];
};

type SoundCloudSearchTrack = {
  id: number;
  title?: string;
  duration?: number;
  permalink_url?: string;
  description?: string | null;
  genre?: string | null;
  tag_list?: string | null;
  access?: "playable" | "preview" | "blocked";
  label_name?: string | null;
  publisher_metadata?: {
    artist?: string | null;
    album_title?: string | null;
    publisher?: string | null;
    writer_composer?: string | null;
    release_title?: string | null;
  } | null;
  user?: {
    username?: string;
  };
};

type SoundCloudCollectionResponse = {
  collection?: unknown[];
  next_href?: string;
};

type SoundCloudSearchPlaylist = {
  id: number;
  title?: string;
  description?: string | null;
  permalink_url?: string;
  genre?: string | null;
  tag_list?: string | null;
  user?: {
    username?: string;
  };
  tracks?: SoundCloudSearchTrack[];
};

export type SoundCloudSelectionResult = {
  query: string;
  source: "soundcloud";
  fetchedTrackCount: number;
  fetchedPlaylistCount: number;
  candidateTrackCount: number;
  returnedCount: number;
  tracks: SelectedGameTrack[];
};

export class SoundCloudSelectionError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "SoundCloudSelectionError";
    this.status = status;
    this.code = code;
  }
}

type SelectTracksInput = {
  query: string;
  token: string;
  count?: number;
  searchLimit?: number;
};

const SOUND_CLOUD_API_BASE = "https://api.soundcloud.com";
const TEN_SECONDS = 10;

export async function selectSoundCloudTracksForGame({
  query,
  token,
  count = 10,
  searchLimit = 50
}: SelectTracksInput): Promise<SoundCloudSelectionResult> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    throw new SoundCloudSelectionError("Enter a genre string before searching.", 400, "missing_query");
  }

  const [trackCollection, playlistCollection] = await Promise.all([
    searchSoundCloud<SoundCloudSearchTrack>("tracks", normalizedQuery, token, searchLimit),
    searchSoundCloud<SoundCloudSearchPlaylist>("playlists", normalizedQuery, token, searchLimit)
  ]);
  const hydratedPlaylists = await hydratePlaylists(playlistCollection, token);

  const directCandidates = trackCollection
    .filter(isEligibleTrack)
    .map((track) => mapTrack(track, "track_search", null));
  const playlistCandidates = hydratedPlaylists.flatMap((playlist) =>
    (playlist.tracks ?? [])
      .filter(isEligibleTrack)
      .map((track) => mapTrack(track, "playlist_search", playlist))
  );
  const eligibleTracks = dedupeTracks([...directCandidates, ...playlistCandidates]);

  if (eligibleTracks.length < count) {
    throw new SoundCloudSelectionError(
      `Only ${eligibleTracks.length} playable tracks were found for "${normalizedQuery}". Update the genre string and try again.`,
      422,
      "insufficient_results"
    );
  }

  const selectedTracks = shuffle([...eligibleTracks]).slice(0, count);

  return {
    query: normalizedQuery,
    source: "soundcloud",
    fetchedTrackCount: trackCollection.length,
    fetchedPlaylistCount: playlistCollection.length,
    candidateTrackCount: eligibleTracks.length,
    returnedCount: selectedTracks.length,
    tracks: selectedTracks
  };
}

async function hydratePlaylists(playlists: SoundCloudSearchPlaylist[], token: string) {
  const playlistsToHydrate = playlists.slice(0, 10);
  const hydrated = await Promise.all(
    playlistsToHydrate.map(async (playlist) => {
      if (playlist.tracks && playlist.tracks.length > 0) {
        return playlist;
      }

      try {
        return await fetchSoundCloudResource<SoundCloudSearchPlaylist>(
          `playlists/${playlist.id}`,
          token
        );
      } catch {
        return playlist;
      }
    })
  );

  return [...hydrated, ...playlists.slice(10)];
}

async function searchSoundCloud<T>(
  resource: "tracks" | "playlists",
  query: string,
  token: string,
  searchLimit: number
): Promise<T[]> {
  const searchUrl = new URL(`${SOUND_CLOUD_API_BASE}/${resource}`);
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("limit", String(Math.min(searchLimit, 50)));
  searchUrl.searchParams.set("linked_partitioning", "true");

  if (resource === "tracks") {
    searchUrl.searchParams.set("access", "playable,preview");
  }

  const response = await fetch(searchUrl, {
    headers: {
      accept: "application/json; charset=utf-8",
      Authorization: `OAuth ${token}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new SoundCloudSelectionError(
      `SoundCloud ${resource} search failed with HTTP ${response.status}.`,
      response.status,
      "soundcloud_request_failed"
    );
  }

  const payload = (await response.json()) as SoundCloudCollectionResponse | T[];
  return (Array.isArray(payload) ? payload : payload.collection ?? []) as T[];
}

async function fetchSoundCloudResource<T>(resourcePath: string, token: string) {
  const url = new URL(`${SOUND_CLOUD_API_BASE}/${resourcePath}`);
  const response = await fetch(url, {
    headers: {
      accept: "application/json; charset=utf-8",
      Authorization: `OAuth ${token}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new SoundCloudSelectionError(
      `SoundCloud resource request failed with HTTP ${response.status}.`,
      response.status,
      "soundcloud_request_failed"
    );
  }

  return (await response.json()) as T;
}

function isEligibleTrack(track: SoundCloudSearchTrack) {
  return (
    (track.access === "playable" || track.access === "preview") &&
    typeof track.duration === "number" &&
    track.duration >= TEN_SECONDS * 1000 &&
    typeof track.permalink_url === "string" &&
    track.permalink_url.length > 0 &&
    typeof track.title === "string" &&
    track.title.length > 0 &&
    typeof track.user?.username === "string" &&
    track.user.username.length > 0
  );
}

function mapTrack(
  track: SoundCloudSearchTrack,
  discoverySource: SelectedGameTrack["discoverySource"],
  playlist: SoundCloudSearchPlaylist | null
): SelectedGameTrack {
  const artistName = track.user?.username ?? "Unknown artist";
  const title = track.title ?? "Untitled";
  const playlistContext = playlist?.title ?? null;

  return {
    id: String(track.id),
    title,
    artistName,
    label: `${artistName} - ${title}`,
    sourceUrl: track.permalink_url ?? "",
    discoverySource,
    playlistContext,
    durationSeconds: Math.floor((track.duration ?? 0) / 1000),
    access: track.access === "preview" ? "preview" : "playable",
    genre: track.genre ?? null,
    tagList: track.tag_list ?? null,
    description: track.description ?? null,
    narrativeHints: buildNarrativeHints(track, artistName, title, playlistContext),
    chunkWindows: buildChunkWindows(track.id, track.duration ?? 0)
  };
}

function buildNarrativeHints(
  track: SoundCloudSearchTrack,
  artistName: string,
  title: string,
  playlistContext: string | null
) {
  const rawHints = [
    track.genre ? `The SoundCloud genre is ${track.genre}.` : null,
    summarizeTags(track.tag_list),
    track.publisher_metadata?.album_title
      ? `SoundCloud metadata links this recording to an album or release.`
      : null,
    track.publisher_metadata?.writer_composer
      ? `SoundCloud includes writer or composer metadata for this track.`
      : null,
    track.label_name ? `The upload includes label metadata.` : null,
    playlistContext ? `SoundCloud surfaced this track from a playlist result.` : null,
    track.description ? summarizeDescription(track.description) : null
  ];

  return rawHints
    .filter((hint): hint is string => Boolean(hint))
    .map((hint) => sanitizeHint(hint, [artistName, title, track.publisher_metadata?.artist ?? ""]))
    .filter((hint) => hint.length > 0)
    .slice(0, 3);
}

function summarizeTags(tagList?: string | null) {
  if (!tagList) {
    return null;
  }

  const tags = tagList
    .split(/\s+/)
    .map((tag) => tag.replace(/^"|"$/g, "").trim())
    .filter(Boolean)
    .slice(0, 4);

  return tags.length > 0 ? `Tags include ${tags.join(", ")}.` : null;
}

function summarizeDescription(description: string) {
  const sentence = description.replace(/\s+/g, " ").split(/[.!?]/)[0]?.trim();
  return sentence ? `Uploader note: ${sentence}.` : null;
}

function sanitizeHint(hint: string, forbiddenTerms: string[]) {
  return forbiddenTerms.reduce((currentHint, term) => {
    if (!term.trim()) {
      return currentHint;
    }

    return currentHint.replace(new RegExp(escapeRegExp(term), "gi"), "[hidden]");
  }, hint);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dedupeTracks(tracks: SelectedGameTrack[]) {
  const seen = new Set<string>();
  const deduped: SelectedGameTrack[] = [];

  for (const track of tracks) {
    if (seen.has(track.id)) {
      continue;
    }

    seen.add(track.id);
    deduped.push(track);
  }

  return deduped;
}

function buildChunkWindows(trackId: number, durationMs: number, windowCount = 6): GameTrackWindow[] {
  const durationSeconds = Math.max(TEN_SECONDS, Math.floor(durationMs / 1000));
  const maxStart = Math.max(0, durationSeconds - TEN_SECONDS);
  const lowerBound = durationSeconds > 45 ? 10 : 0;
  const upperBound = durationSeconds > 45 ? Math.max(lowerBound, maxStart - 10) : maxStart;
  const candidateStarts: number[] = [];

  for (let start = lowerBound; start <= upperBound; start += TEN_SECONDS) {
    candidateStarts.push(start);
  }

  if (candidateStarts.length === 0) {
    candidateStarts.push(0);
  }

  const shuffledStarts = shuffleDeterministic(candidateStarts, trackId).slice(
    0,
    Math.min(windowCount, candidateStarts.length)
  );

  return shuffledStarts.map((startSeconds) => ({
    startSeconds,
    durationSeconds: TEN_SECONDS,
    label: `${formatTime(startSeconds)}-${formatTime(startSeconds + TEN_SECONDS)}`
  }));
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function shuffle<T>(items: T[]) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }

  return items;
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
