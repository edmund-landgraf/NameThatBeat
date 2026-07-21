import { NextResponse } from "next/server";

import {
  applyVoteToCandidates,
  leadingCandidateId,
  newVoteId
} from "@/lib/samples/candidates";
import { getSample, saveSample } from "@/lib/samples/store";
import type { SampleVote } from "@/lib/samples/types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type VoteBody = {
  choice?: SampleVote["choice"];
  candidateAId?: string;
  candidateBId?: string;
  note?: string;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const sample = await getSample(id);

  if (!sample) {
    return NextResponse.json({ error: "Sample not found." }, { status: 404 });
  }

  const body = (await request.json()) as VoteBody;
  const choice = body.choice;
  const candidateAId = body.candidateAId;
  const candidateBId = body.candidateBId;

  if (!choice || !candidateAId || !candidateBId) {
    return NextResponse.json(
      { error: "choice, candidateAId, and candidateBId are required." },
      { status: 400 }
    );
  }

  if (!["a", "b", "neither", "unsure"].includes(choice)) {
    return NextResponse.json({ error: "Invalid vote choice." }, { status: 400 });
  }

  const hasA = sample.candidates.some((candidate) => candidate.id === candidateAId);
  const hasB = sample.candidates.some((candidate) => candidate.id === candidateBId);

  if (!hasA || !hasB) {
    return NextResponse.json({ error: "Vote referenced unknown candidates." }, { status: 400 });
  }

  const vote: SampleVote = {
    id: newVoteId(),
    at: new Date().toISOString(),
    choice,
    candidateAId,
    candidateBId,
    note: body.note?.trim() || undefined
  };

  const candidates = applyVoteToCandidates(sample.candidates, vote);
  const updated = await saveSample({
    ...sample,
    candidates,
    votes: [...sample.votes, vote],
    leadingCandidateId: leadingCandidateId(candidates),
    status: sample.status === "identified" ? sample.status : "verifying",
    updatedAt: new Date().toISOString()
  });

  return NextResponse.json({ sample: updated, vote });
}
