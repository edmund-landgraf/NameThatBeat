export type SampleSource = "shazam_failed" | "other_id_failed" | "manual_clip";

export type SampleStatus =
  | "queued"
  | "needs_candidates"
  | "verifying"
  | "identified"
  | "stale";

export type SampleCandidate = {
  id: string;
  label: string;
  title: string;
  artistName: string;
  sourceUrl: string | null;
  discoverySource: "catalog" | "soundcloud_search" | "manual";
  score: number;
  voteCount: number;
};

export type SampleVote = {
  id: string;
  at: string;
  choice: "a" | "b" | "neither" | "unsure";
  candidateAId: string;
  candidateBId: string;
  note?: string;
};

export type UnknownSample = {
  id: string;
  createdAt: string;
  updatedAt: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  audioFileName: string;
  source: SampleSource;
  notes: string;
  genreHint: string | null;
  status: SampleStatus;
  candidates: SampleCandidate[];
  votes: SampleVote[];
  identifiedLabel: string | null;
  leadingCandidateId: string | null;
};

export type SampleSummary = Pick<
  UnknownSample,
  | "id"
  | "createdAt"
  | "originalFilename"
  | "source"
  | "notes"
  | "genreHint"
  | "status"
  | "identifiedLabel"
  | "leadingCandidateId"
> & {
  candidateCount: number;
  voteCount: number;
};
