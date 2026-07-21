import { NextResponse } from "next/server";

import { getUsableSoundCloudAccessToken } from "@/lib/soundcloud-oauth";
import { SoundCloudSelectionError, selectSoundCloudTracksForGame } from "@/lib/soundcloud-selection";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const query = searchParams.get("q")?.trim() ?? "";
  const count = clamp(Number(searchParams.get("count") ?? 10), 1, 20);
  const searchLimit = clamp(Number(searchParams.get("limit") ?? 50), 1, 50);
  const token = await getUsableSoundCloudAccessToken(requestUrl.origin);

  if (!query) {
    return NextResponse.json(
      { error: "Enter a genre string before searching." },
      { status: 400 }
    );
  }

  if (!token) {
    return NextResponse.json(
      {
        error:
          "Connect SoundCloud or configure SOUNDCLOUD_ACCESS_TOKEN to enable live track selection."
      },
      { status: 503 }
    );
  }

  try {
    const result = await selectSoundCloudTracksForGame({
      query,
      token,
      count,
      searchLimit
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SoundCloudSelectionError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: "Unexpected SoundCloud selection failure." },
      { status: 500 }
    );
  }
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}
