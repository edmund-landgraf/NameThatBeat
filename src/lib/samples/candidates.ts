import { randomUUID } from "node:crypto";

import {
  getApprovedSourceUrl,
  getCatalogTracks,
  getTrackArtistName,
  getTrackLabel
} from "@/lib/catalog/load-catalog";
import type { SeedTrack } from "@/lib/catalog/types";
import { shuffle } from "@/lib/game/shuffle";
import type { SampleCandidate, UnknownSample } from "@/lib/samples/types";
import { searchPlayableTracks } from "@/lib/soundcloud-resolve";

const MAX_CANDIDATES = 6;

export async function generateCandidatesForSample(
  sample: UnknownSample,
  token: string | null
): Promise<SampleCandidate[]> {
  const query = buildSearchQuery(sample);
  const catalogHits = await pickCatalogCandidates(sample, query);
  const liveHits: SampleCandidate[] = [];

  if (token && query) {
    try {
      const tracks = await searchPlayableTracks(query, token, 20);
      for (const track of shuffle(tracks).slice(0, 4)) {
        liveHits.push({
          id: `cand_sc_${track.id}`,
          label: `${track.artistName} - ${track.title}`,
          title: track.title,
          artistName: track.artistName,
          sourceUrl: track.sourceUrl,
          discoverySource: "soundcloud_search",
          score: 0.45,
          voteCount: 0
        });
      }
    } catch {
      // SoundCloud may be unavailable; catalog candidates still work for A/B labels.
    }
  }

  const merged = dedupeCandidates([...catalogHits, ...liveHits]).slice(0, MAX_CANDIDATES);

  if (merged.length >= 2) {
    return merged;
  }

  // Guarantee at least two distractors from the full catalog so A/B can run offline.
  const allTracks = await getCatalogTracks();
  const fillers = shuffle(allTracks)
    .filter((track) => !merged.some((candidate) => candidate.id === `cand_seed_${track.id}`))
    .slice(0, 2 - merged.length)
    .map((track) => seedToCandidate(track, 0.2));

  return dedupeCandidates([...merged, ...fillers]).slice(0, MAX_CANDIDATES);
}

export { pickAbPair } from "@/lib/samples/voting";

export function applyVoteToCandidates(
  candidates: SampleCandidate[],
  vote: { choice: "a" | "b" | "neither" | "unsure"; candidateAId: string; candidateBId: string }
) {
  const next = candidates.map((candidate) => ({ ...candidate }));

  const bump = (id: string, amount: number) => {
    const target = next.find((candidate) => candidate.id === id);
    if (!target) {
      return;
    }

    target.score = Math.max(0, Math.min(1, target.score + amount));
    target.voteCount += 1;
  };

  if (vote.choice === "a") {
    bump(vote.candidateAId, 0.12);
    bump(vote.candidateBId, -0.04);
  } else if (vote.choice === "b") {
    bump(vote.candidateBId, 0.12);
    bump(vote.candidateAId, -0.04);
  } else if (vote.choice === "neither") {
    bump(vote.candidateAId, -0.06);
    bump(vote.candidateBId, -0.06);
  }

  return next;
}

export function leadingCandidateId(candidates: SampleCandidate[]) {
  if (candidates.length === 0) {
    return null;
  }

  const ranked = [...candidates].sort((a, b) => b.score - a.score || b.voteCount - a.voteCount);
  return ranked[0]?.id ?? null;
}

function buildSearchQuery(sample: UnknownSample) {
  const parts = [sample.genreHint, sample.notes].filter(Boolean);
  return parts.join(" ").trim() || sample.genreHint || "music";
}

async function pickCatalogCandidates(sample: UnknownSample, query: string) {
  const genreTracks = sample.genreHint
    ? await getCatalogTracks(sample.genreHint.toLowerCase())
    : await getCatalogTracks();

  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/g, ""))
    .filter((token) => token.length > 2);

  const scored = genreTracks.map((track) => {
    const haystack = `${track.display_title} ${track.work} ${track.composer ?? ""} ${track.artist ?? ""} ${track.genre}`.toLowerCase();
    const hits = tokens.filter((token) => haystack.includes(token)).length;
    const score = tokens.length === 0 ? 0.3 : Math.min(0.85, 0.25 + hits / Math.max(tokens.length, 1));
    return { track, score };
  });

  return shuffle(scored)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ track, score }) => seedToCandidate(track, score));
}

function seedToCandidate(track: SeedTrack, score: number): SampleCandidate {
  const approved = getApprovedSourceUrl(track);

  return {
    id: `cand_seed_${track.id}`,
    label: getTrackLabel(track),
    title: track.work,
    artistName: getTrackArtistName(track),
    sourceUrl: approved?.track_url ?? null,
    discoverySource: "catalog",
    score,
    voteCount: 0
  };
}

function dedupeCandidates(candidates: SampleCandidate[]) {
  const seen = new Set<string>();
  const result: SampleCandidate[] = [];

  for (const candidate of candidates) {
    const key = candidate.label.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(candidate);
  }

  return result;
}

export function newVoteId() {
  return `vote_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}
