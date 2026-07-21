import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { SampleSummary, UnknownSample } from "@/lib/samples/types";

const samplesRoot = path.join(process.cwd(), ".local", "samples");
const indexPath = path.join(samplesRoot, "index.json");

async function ensureStore() {
  await mkdir(samplesRoot, { recursive: true });

  try {
    await readFile(indexPath, "utf8");
  } catch {
    await writeFile(indexPath, JSON.stringify({ samples: [] satisfies UnknownSample[] }, null, 2), "utf8");
  }
}

async function readIndex(): Promise<UnknownSample[]> {
  await ensureStore();
  const raw = await readFile(indexPath, "utf8");
  const parsed = JSON.parse(raw) as { samples?: UnknownSample[] };
  return parsed.samples ?? [];
}

async function writeIndex(samples: UnknownSample[]) {
  await ensureStore();
  await writeFile(indexPath, JSON.stringify({ samples }, null, 2), "utf8");
}

export function getSamplesRoot() {
  return samplesRoot;
}

export async function listSamples(): Promise<SampleSummary[]> {
  const samples = await readIndex();

  return samples
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((sample) => ({
      id: sample.id,
      createdAt: sample.createdAt,
      originalFilename: sample.originalFilename,
      source: sample.source,
      notes: sample.notes,
      genreHint: sample.genreHint,
      status: sample.status,
      identifiedLabel: sample.identifiedLabel,
      leadingCandidateId: sample.leadingCandidateId,
      candidateCount: sample.candidates.length,
      voteCount: sample.votes.length
    }));
}

export async function getSample(id: string) {
  const samples = await readIndex();
  return samples.find((sample) => sample.id === id) ?? null;
}

export async function saveSample(sample: UnknownSample) {
  const samples = await readIndex();
  const index = samples.findIndex((entry) => entry.id === sample.id);

  if (index === -1) {
    samples.unshift(sample);
  } else {
    samples[index] = sample;
  }

  await writeIndex(samples);
  return sample;
}

export async function createSampleFromUpload(input: {
  fileBuffer: Buffer;
  originalFilename: string;
  mimeType: string;
  source: UnknownSample["source"];
  notes: string;
  genreHint: string | null;
}) {
  await ensureStore();

  const id = `sample_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const extension = extensionForMime(input.mimeType, input.originalFilename);
  const audioFileName = `${id}${extension}`;
  const audioPath = path.join(samplesRoot, audioFileName);
  const now = new Date().toISOString();

  await writeFile(audioPath, input.fileBuffer);

  const sample: UnknownSample = {
    id,
    createdAt: now,
    updatedAt: now,
    originalFilename: input.originalFilename,
    mimeType: input.mimeType,
    sizeBytes: input.fileBuffer.byteLength,
    audioFileName,
    source: input.source,
    notes: input.notes.trim(),
    genreHint: input.genreHint?.trim() || null,
    status: "needs_candidates",
    candidates: [],
    votes: [],
    identifiedLabel: null,
    leadingCandidateId: null
  };

  await saveSample(sample);
  return sample;
}

export function getSampleAudioPath(sample: UnknownSample) {
  return path.join(samplesRoot, sample.audioFileName);
}

export async function sampleAudioExists(sample: UnknownSample) {
  try {
    const files = await readdir(samplesRoot);
    return files.includes(sample.audioFileName);
  } catch {
    return false;
  }
}

function extensionForMime(mimeType: string, filename: string) {
  const fromName = path.extname(filename);
  if (fromName) {
    return fromName.slice(0, 8);
  }

  switch (mimeType) {
    case "audio/mpeg":
      return ".mp3";
    case "audio/wav":
    case "audio/x-wav":
      return ".wav";
    case "audio/webm":
      return ".webm";
    case "audio/mp4":
    case "audio/x-m4a":
      return ".m4a";
    case "audio/ogg":
      return ".ogg";
    default:
      return ".bin";
  }
}
