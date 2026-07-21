import { NextResponse } from "next/server";

import { getSample, saveSample } from "@/lib/samples/store";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type IdentifyBody = {
  label?: string;
  candidateId?: string;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const sample = await getSample(id);

  if (!sample) {
    return NextResponse.json({ error: "Sample not found." }, { status: 404 });
  }

  const body = (await request.json()) as IdentifyBody;
  let identifiedLabel = body.label?.trim() || null;

  if (body.candidateId) {
    const candidate = sample.candidates.find((entry) => entry.id === body.candidateId);
    if (!candidate) {
      return NextResponse.json({ error: "Unknown candidate." }, { status: 400 });
    }

    identifiedLabel = candidate.label;
  }

  if (!identifiedLabel) {
    return NextResponse.json(
      { error: "Provide a title/artist label or candidateId to mark identified." },
      { status: 400 }
    );
  }

  const updated = await saveSample({
    ...sample,
    status: "identified",
    identifiedLabel,
    leadingCandidateId: body.candidateId ?? sample.leadingCandidateId,
    updatedAt: new Date().toISOString()
  });

  return NextResponse.json({ sample: updated });
}
