import { NextResponse } from "next/server";

import { recordScoreSubmission, type ScoreSubmission } from "@/lib/game/score-log";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: ScoreSubmission;

  try {
    body = (await request.json()) as ScoreSubmission;
  } catch {
    return NextResponse.json({ error: "Expected JSON score payload." }, { status: 400 });
  }

  try {
    const result = await recordScoreSubmission(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not record score." },
      { status: 400 }
    );
  }
}
