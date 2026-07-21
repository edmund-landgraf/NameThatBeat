import { NextResponse } from "next/server";

import { buildSoloGameSet, SoloSetError } from "@/lib/catalog/build-solo-set";
import type { SeedDifficulty } from "@/lib/catalog/types";
import { TARGET_SET_SIZE } from "@/lib/game/scoring";
import { getUsableSoundCloudAccessToken } from "@/lib/soundcloud-oauth";
import { SoundCloudResolveError } from "@/lib/soundcloud-resolve";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const genre = requestUrl.searchParams.get("genre")?.trim().toLowerCase() ?? "";
  const difficultyParam = requestUrl.searchParams.get("difficulty")?.trim().toLowerCase() ?? "easy";
  const setSizeParam = Number(requestUrl.searchParams.get("setSize") ?? TARGET_SET_SIZE);
  const setSize = clamp(Number.isFinite(setSizeParam) ? setSizeParam : TARGET_SET_SIZE, 1, 10);

  if (!genre) {
    return NextResponse.json({ error: "Choose a genre before starting a set." }, { status: 400 });
  }

  if (!isDifficulty(difficultyParam)) {
    return NextResponse.json(
      { error: "Difficulty must be easy, medium, or hard." },
      { status: 400 }
    );
  }

  const token = await getUsableSoundCloudAccessToken(requestUrl.origin);

  try {
    const gameSet = await buildSoloGameSet({
      genre,
      difficulty: difficultyParam,
      token,
      setSize
    });

    return NextResponse.json(gameSet);
  } catch (error) {
    if (error instanceof SoloSetError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    if (error instanceof SoundCloudResolveError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    return NextResponse.json({ error: "Unexpected solo set build failure." }, { status: 500 });
  }
}

function isDifficulty(value: string): value is SeedDifficulty {
  return value === "easy" || value === "medium" || value === "hard";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
