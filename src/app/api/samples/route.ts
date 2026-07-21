import { NextResponse } from "next/server";

import {
  generateCandidatesForSample,
  leadingCandidateId
} from "@/lib/samples/candidates";
import { createSampleFromUpload, listSamples, saveSample } from "@/lib/samples/store";
import type { SampleSource } from "@/lib/samples/types";
import { getUsableSoundCloudAccessToken } from "@/lib/soundcloud-oauth";

export const runtime = "nodejs";

const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/ogg",
  "audio/aac"
]);

export async function GET() {
  const samples = await listSamples();
  return NextResponse.json({ samples });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("audio");
  const notes = String(form.get("notes") ?? "");
  const genreHint = String(form.get("genreHint") ?? "").trim() || null;
  const sourceValue = String(form.get("source") ?? "shazam_failed");
  const source = isSampleSource(sourceValue) ? sourceValue : "shazam_failed";

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Attach an audio clip from the failed Shazam (or other) lookup." },
      { status: 400 }
    );
  }

  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Audio must be between 1 byte and 12 MB." }, { status: 400 });
  }

  const mimeType = file.type || guessMime(file.name);
  if (!ALLOWED_TYPES.has(mimeType) && !file.name.match(/\.(mp3|wav|m4a|webm|ogg|aac)$/i)) {
    return NextResponse.json(
      { error: "Unsupported audio type. Use mp3, wav, m4a, webm, ogg, or aac." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let sample = await createSampleFromUpload({
    fileBuffer: buffer,
    originalFilename: file.name || "failed-clip.mp3",
    mimeType,
    source,
    notes,
    genreHint
  });

  const requestUrl = new URL(request.url);
  const token = await getUsableSoundCloudAccessToken(requestUrl.origin);

  try {
    const candidates = await generateCandidatesForSample(sample, token);
    sample = await saveSample({
      ...sample,
      candidates,
      status: candidates.length >= 2 ? "verifying" : "needs_candidates",
      leadingCandidateId: leadingCandidateId(candidates),
      updatedAt: new Date().toISOString()
    });
  } catch {
    // Sample remains available; candidates can be refreshed from the detail view.
  }

  return NextResponse.json({ sample }, { status: 201 });
}

function isSampleSource(value: string): value is SampleSource {
  return value === "shazam_failed" || value === "other_id_failed" || value === "manual_clip";
}

function guessMime(filename: string) {
  if (filename.endsWith(".wav")) return "audio/wav";
  if (filename.endsWith(".m4a")) return "audio/mp4";
  if (filename.endsWith(".webm")) return "audio/webm";
  if (filename.endsWith(".ogg")) return "audio/ogg";
  return "audio/mpeg";
}
