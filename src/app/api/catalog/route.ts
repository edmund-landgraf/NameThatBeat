import { NextResponse } from "next/server";

import {
  getCatalogTracks,
  listCatalogDifficulties,
  listCatalogGenres,
  loadMergedCatalog
} from "@/lib/catalog/load-catalog";
import type { SeedDifficulty } from "@/lib/catalog/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get("genre")?.trim().toLowerCase() || undefined;
  const difficultyParam = searchParams.get("difficulty")?.trim().toLowerCase();
  const difficulty = isDifficulty(difficultyParam) ? difficultyParam : undefined;
  const catalog = await loadMergedCatalog();
  const tracks = await getCatalogTracks(genre, difficulty);
  const genres = await listCatalogGenres();
  const difficulties = await listCatalogDifficulties(genre);
  const harvestedCount = catalog.tracks.filter((track) => track.id.startsWith("harvest_")).length;

  return NextResponse.json({
    seedName: catalog.seed_name,
    version: catalog.version,
    genres,
    difficulties,
    trackCount: tracks.length,
    harvestedCount,
    tracks: tracks.map((track) => ({
      id: track.id,
      label: track.display_title,
      genre: track.genre,
      difficulty: track.difficulty,
      hasApprovedSource: Boolean(track.audio_sources?.some((source) => source.track_url)),
      audioSourceStatus: track.audio_source_status,
      harvested: track.id.startsWith("harvest_")
    }))
  });
}

function isDifficulty(value: string | undefined): value is SeedDifficulty {
  return value === "easy" || value === "medium" || value === "hard";
}
