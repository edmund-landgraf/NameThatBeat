import { NextResponse } from "next/server";

import type { SeedDifficulty } from "@/lib/catalog/types";
import { runInternetArchiveHarvest } from "@/lib/harvest/run-harvest";

export const runtime = "nodejs";

type HarvestBody = {
  genre?: string;
  difficulty?: SeedDifficulty;
  count?: number;
  queryBoosts?: string[];
};

export async function POST(request: Request) {
  let body: HarvestBody = {};

  try {
    body = (await request.json()) as HarvestBody;
  } catch {
    body = {};
  }

  const genre = body.genre?.trim().toLowerCase() || "classical";
  const difficulty = body.difficulty ?? "easy";

  if (!["easy", "medium", "hard"].includes(difficulty)) {
    return NextResponse.json({ error: "difficulty must be easy, medium, or hard." }, { status: 400 });
  }

  try {
    const result = await runInternetArchiveHarvest({
      genre,
      difficulty,
      count: body.count,
      queryBoosts: body.queryBoosts
    });

    return NextResponse.json({
      ok: true,
      ...result,
      message:
        result.accepted > 0
          ? `Harvested ${result.accepted} new Internet Archive track(s) into the active catalog.`
          : "Harvest finished with no new accepted tracks."
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Harvest failed."
      },
      { status: 502 }
    );
  }
}
