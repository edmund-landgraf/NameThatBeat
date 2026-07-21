import type { GameTrackWindow } from "@/lib/catalog/types";
import { normalizeTitleGuess } from "@/lib/game/title-match";
import { buildGeneratedWindows } from "@/lib/game/windows";

type SoundCloudSearchTrack = {
  id: number;
  title?: string;
  duration?: number;
  permalink_url?: string;
  description?: string | null;
  genre?: string | null;
  tag_list?: string | null;
  access?: "playable" | "preview" | "blocked";
  user?: {
    username?: string;
  };
};

type SoundCloudCollectionResponse = {
  collection?: SoundCloudSearchTrack[];
};

const SOUND_CLOUD_API_BASE = "https://api.soundcloud.com";
const TEN_SECONDS = 10;
/** Reject search hits below this combined title/artist relevance score. */
const MIN_MATCH_SCORE = 0.55;

export type ResolveExpectations = {
  titles: string[];
  artists: string[];
};

export type ResolvedSoundCloudTrack = {
  id: string;
  title: string;
  artistName: string;
  sourceUrl: string;
  durationSeconds: number;
  access: "playable" | "preview";
  genre: string | null;
  tagList: string | null;
  description: string | null;
  chunkWindows: GameTrackWindow[];
  matchScore?: number;
};

export class SoundCloudResolveError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "SoundCloudResolveError";
    this.status = status;
    this.code = code;
  }
}

export async function resolveSoundCloudTrackByQuery(
  query: string,
  token: string,
  expectations?: ResolveExpectations
): Promise<ResolvedSoundCloudTrack | null> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return null;
  }

  const tracks = await searchTracks(normalizedQuery, token, 20);
  const eligible = tracks.filter(isEligibleTrack);

  if (eligible.length === 0) {
    return null;
  }

  if (!expectations || (expectations.titles.length === 0 && expectations.artists.length === 0)) {
    return mapResolvedTrack(eligible[0]);
  }

  const ranked = eligible
    .map((track) => ({
      track,
      score: scoreSoundCloudMatch(track, expectations)
    }))
    .filter((entry) => entry.score >= MIN_MATCH_SCORE)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return null;
  }

  return mapResolvedTrack(ranked[0].track, ranked[0].score);
}

export async function searchPlayableTracks(
  query: string,
  token: string,
  limit = 50
): Promise<ResolvedSoundCloudTrack[]> {
  const tracks = await searchTracks(query, token, limit);
  return tracks.filter(isEligibleTrack).map((track) => mapResolvedTrack(track));
}

export function scoreSoundCloudMatch(track: SoundCloudSearchTrack, expectations: ResolveExpectations) {
  const scTitle = normalizeTitleGuess(track.title ?? "");
  const scUser = normalizeTitleGuess(track.user?.username ?? "");
  const haystack = `${scTitle} ${scUser}`;

  let titleScore = 0;

  for (const title of expectations.titles) {
    const normalized = normalizeTitleGuess(title);
    if (!normalized) {
      continue;
    }

    if (scTitle === normalized) {
      titleScore = Math.max(titleScore, 1);
      continue;
    }

    if (scTitle.includes(normalized) || normalized.includes(scTitle)) {
      const shorter = Math.min(scTitle.length, normalized.length);
      const longer = Math.max(scTitle.length, normalized.length);
      titleScore = Math.max(titleScore, shorter / longer);
    }

    const tokens = significantTokens(normalized);
    if (tokens.length > 0) {
      const hits = tokens.filter((token) => haystack.includes(token)).length;
      titleScore = Math.max(titleScore, hits / tokens.length);
    }
  }

  let artistScore = 0;

  for (const artist of expectations.artists) {
    const normalized = normalizeTitleGuess(artist);
    if (!normalized) {
      continue;
    }

    const parts = significantTokens(normalized);
    const surname = parts[parts.length - 1] ?? normalized;

    if (haystack.includes(normalized)) {
      artistScore = Math.max(artistScore, 1);
    } else if (surname.length >= 3 && haystack.includes(surname)) {
      artistScore = Math.max(artistScore, 0.7);
    }
  }

  // Strong title alone can pass; weak title needs artist support.
  if (titleScore >= 0.75) {
    return Math.min(1, titleScore * 0.85 + artistScore * 0.15);
  }

  return Math.min(1, titleScore * 0.65 + artistScore * 0.35);
}

async function searchTracks(query: string, token: string, limit: number) {
  const searchUrl = new URL(`${SOUND_CLOUD_API_BASE}/tracks`);
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("limit", String(Math.min(limit, 50)));
  searchUrl.searchParams.set("linked_partitioning", "true");
  searchUrl.searchParams.set("access", "playable,preview");

  const response = await fetch(searchUrl, {
    headers: {
      accept: "application/json; charset=utf-8",
      Authorization: `OAuth ${token}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new SoundCloudResolveError(
      `SoundCloud track search failed with HTTP ${response.status}.`,
      response.status,
      "soundcloud_request_failed"
    );
  }

  const payload = (await response.json()) as SoundCloudCollectionResponse | SoundCloudSearchTrack[];
  return Array.isArray(payload) ? payload : payload.collection ?? [];
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

function mapResolvedTrack(track: SoundCloudSearchTrack, matchScore?: number): ResolvedSoundCloudTrack {
  const artistName = track.user?.username ?? "Unknown artist";
  const title = track.title ?? "Untitled";
  const durationSeconds = Math.floor((track.duration ?? 0) / 1000);

  return {
    id: String(track.id),
    title,
    artistName,
    sourceUrl: track.permalink_url ?? "",
    durationSeconds,
    access: track.access === "preview" ? "preview" : "playable",
    genre: track.genre ?? null,
    tagList: track.tag_list ?? null,
    description: track.description ?? null,
    chunkWindows: buildGeneratedWindows(durationSeconds, track.id),
    matchScore
  };
}

function significantTokens(value: string) {
  return value.split(" ").filter((token) => token.length > 2 && !/^\d+$/.test(token));
}
