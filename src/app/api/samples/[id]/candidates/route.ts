import { NextResponse } from "next/server";

import {
  generateCandidatesForSample,
  leadingCandidateId
} from "@/lib/samples/candidates";
import { getSample, saveSample } from "@/lib/samples/store";
import { getUsableSoundCloudAccessToken } from "@/lib/soundcloud-oauth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const sample = await getSample(id);

  if (!sample) {
    return NextResponse.json({ error: "Sample not found." }, { status: 404 });
  }

  const requestUrl = new URL(request.url);
  const token = await getUsableSoundCloudAccessToken(requestUrl.origin);
  const candidates = await generateCandidatesForSample(sample, token);

  const updated = await saveSample({
    ...sample,
    candidates,
    status: candidates.length >= 2 ? "verifying" : "needs_candidates",
    leadingCandidateId: leadingCandidateId(candidates),
    updatedAt: new Date().toISOString()
  });

  return NextResponse.json({ sample: updated });
}
