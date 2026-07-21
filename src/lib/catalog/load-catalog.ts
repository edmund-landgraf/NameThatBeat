import soloTracks from "../../../seeds/solo_tracks.json";

import type { SeedCatalog, SeedDifficulty, SeedTrack } from "@/lib/catalog/types";
import { readActiveHarvestCatalog } from "@/lib/harvest/run-harvest";

const staticCatalog = soloTracks as SeedCatalog;

export function loadSoloCatalog(): SeedCatalog {
  return staticCatalog;
}

export async function loadMergedCatalog(): Promise<SeedCatalog> {
  const harvested = await readActiveHarvestCatalog();
  const tracks = dedupeTracks([...staticCatalog.tracks, ...harvested.tracks]);

  return {
    seed_name: "solo_merged",
    version: staticCatalog.version + harvested.version,
    notes: "Static seeds plus Internet Archive harvest overlay.",
    tracks
  };
}

export async function listCatalogGenres(): Promise<string[]> {
  const catalog = await loadMergedCatalog();
  return [...new Set(catalog.tracks.map((track) => track.genre))].sort();
}

export async function listCatalogDifficulties(genre?: string): Promise<SeedDifficulty[]> {
  const catalog = await loadMergedCatalog();
  const tracks = genre
    ? catalog.tracks.filter((track) => track.genre === genre)
    : catalog.tracks;

  return [...new Set(tracks.map((track) => track.difficulty))].sort() as SeedDifficulty[];
}

export async function getCatalogTracks(
  genre?: string,
  difficulty?: SeedDifficulty
): Promise<SeedTrack[]> {
  const catalog = await loadMergedCatalog();

  return catalog.tracks.filter((track) => {
    if (genre && track.genre !== genre) {
      return false;
    }

    if (difficulty && track.difficulty !== difficulty) {
      return false;
    }

    return true;
  });
}

export function getTrackLabel(track: SeedTrack) {
  return track.display_title;
}

export function getTrackArtistName(track: SeedTrack) {
  return track.composer ?? track.artist ?? "Unknown";
}

export function getApprovedSourceUrl(track: SeedTrack) {
  const source = track.audio_sources?.find(
    (entry) => entry.can_stream !== false && Boolean(entry.track_url)
  );

  return source ?? null;
}

export function getPlaybackMethod(track: SeedTrack): "soundcloud_widget" | "html5_stream" {
  const source = getApprovedSourceUrl(track);
  if (source?.playback_method === "html5_stream") {
    return "html5_stream";
  }

  if (source?.track_url && !source.track_url.includes("soundcloud.com")) {
    return "html5_stream";
  }

  return "soundcloud_widget";
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
