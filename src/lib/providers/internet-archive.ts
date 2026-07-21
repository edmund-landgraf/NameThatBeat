import type { ProviderTrack, RightsStatus } from "@/lib/providers/types";

type IaSearchDoc = {
  identifier?: string;
  title?: string | string[];
  creator?: string | string[];
  licenseurl?: string | string[];
  subject?: string | string[];
  mediatype?: string;
};

type IaSearchResponse = {
  response?: {
    docs?: IaSearchDoc[];
    numFound?: number;
  };
};

type IaMetadataResponse = {
  metadata?: {
    title?: string | string[];
    creator?: string | string[];
    licenseurl?: string | string[];
    subject?: string | string[];
    runtime?: string;
    length?: string;
  };
  files?: Array<{
    name?: string;
    format?: string;
    size?: string;
    length?: string;
    original?: string;
  }>;
};

const IA_SEARCH = "https://archive.org/advancedsearch.php";
const ALLOWED_RIGHTS: RightsStatus[] = ["public_domain", "cc_by", "cc_by_sa"];

export type IaSearchInput = {
  query: string;
  rows?: number;
  minDurationSeconds?: number;
  maxDurationSeconds?: number;
};

export async function searchInternetArchiveAudio({
  query,
  rows = 40,
  minDurationSeconds = 60,
  maxDurationSeconds = 900
}: IaSearchInput): Promise<ProviderTrack[]> {
  const q = [
    "mediatype:audio",
    `(${query})`,
    "(licenseurl:(*creativecommons.org*) OR licenseurl:(*publicdomain*) OR licenseurl:(*public.domain*) OR licenseurl:(*cc0*))"
  ].join(" AND ");

  const url = new URL(IA_SEARCH);
  url.searchParams.set("q", q);
  url.searchParams.set("output", "json");
  url.searchParams.set("rows", String(Math.min(rows, 50)));
  url.searchParams.set("page", "1");
  for (const field of ["identifier", "title", "creator", "licenseurl", "subject", "mediatype"]) {
    url.searchParams.append("fl[]", field);
  }

  const response = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Internet Archive search failed with HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as IaSearchResponse;
  const docs = payload.response?.docs ?? [];
  const tracks: ProviderTrack[] = [];

  for (const doc of docs) {
    if (!doc.identifier) {
      continue;
    }

    try {
      const track = await hydrateInternetArchiveItem(doc.identifier, {
        minDurationSeconds,
        maxDurationSeconds,
        fallbackTitle: firstString(doc.title),
        fallbackCreator: firstString(doc.creator),
        fallbackLicense: firstString(doc.licenseurl),
        fallbackSubject: firstString(doc.subject)
      });

      if (track && ALLOWED_RIGHTS.includes(track.rightsStatus)) {
        tracks.push(track);
      }
    } catch {
      // Skip items that fail metadata/file resolution.
    }
  }

  return tracks;
}

async function hydrateInternetArchiveItem(
  identifier: string,
  options: {
    minDurationSeconds: number;
    maxDurationSeconds: number;
    fallbackTitle: string | null;
    fallbackCreator: string | null;
    fallbackLicense: string | null;
    fallbackSubject: string | null;
  }
): Promise<ProviderTrack | null> {
  const metaResponse = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, {
    headers: { accept: "application/json" },
    cache: "no-store"
  });

  if (!metaResponse.ok) {
    return null;
  }

  const meta = (await metaResponse.json()) as IaMetadataResponse;
  const title =
    firstString(meta.metadata?.title) ?? options.fallbackTitle ?? identifier;
  const artistName =
    firstString(meta.metadata?.creator) ?? options.fallbackCreator ?? "Unknown artist";
  const licenseUrl =
    firstString(meta.metadata?.licenseurl) ?? options.fallbackLicense ?? null;
  const rightsStatus = classifyLicense(licenseUrl);

  if (!ALLOWED_RIGHTS.includes(rightsStatus)) {
    return null;
  }

  const audioFile = pickAudioFile(meta.files ?? []);
  if (!audioFile?.name) {
    return null;
  }

  const durationSeconds =
    parseDuration(audioFile.length) ??
    parseDuration(meta.metadata?.runtime) ??
    parseDuration(meta.metadata?.length) ??
    0;

  if (
    durationSeconds < options.minDurationSeconds ||
    durationSeconds > options.maxDurationSeconds
  ) {
    return null;
  }

  const sourceUrl = `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(audioFile.name)}`;
  const pageUrl = `https://archive.org/details/${encodeURIComponent(identifier)}`;
  const genre = inferGenre(options.fallbackSubject ?? firstString(meta.metadata?.subject));

  return {
    provider: "internet_archive",
    providerTrackId: identifier,
    sourceUrl,
    pageUrl,
    title,
    artistName,
    genre,
    durationSeconds,
    licenseUrl,
    rightsStatus,
    playbackMethod: "html5_stream",
    attributionText: `${artistName} — ${title} (Internet Archive, ${rightsStatus.replace(/_/g, " ")})`,
    qualityScore: scoreQuality({ title, artistName, licenseUrl, durationSeconds })
  };
}

function pickAudioFile(
  files: NonNullable<IaMetadataResponse["files"]>
): NonNullable<IaMetadataResponse["files"]>[number] | null {
  const ranked = files
    .filter((file) => {
      const name = file.name?.toLowerCase() ?? "";
      const format = file.format?.toLowerCase() ?? "";
      return (
        name.endsWith(".mp3") ||
        format.includes("mp3") ||
        name.endsWith(".ogg") ||
        format.includes("vorbis") ||
        name.endsWith(".m4a")
      );
    })
    .sort((a, b) => {
      const aScore = scoreFile(a);
      const bScore = scoreFile(b);
      return bScore - aScore;
    });

  return ranked[0] ?? null;
}

function scoreFile(file: NonNullable<IaMetadataResponse["files"]>[number]) {
  const format = (file.format ?? "").toLowerCase();
  const name = (file.name ?? "").toLowerCase();
  let score = 0;

  if (format.includes("vbr mp3") || format.includes("128kbps")) score += 3;
  if (name.endsWith(".mp3")) score += 2;
  if (format.includes("mp3")) score += 2;
  if (file.original) score -= 1;
  if (name.includes("_64kb") || name.includes("64kbps")) score -= 2;

  return score;
}

export function classifyLicense(licenseUrl: string | null): RightsStatus {
  if (!licenseUrl) {
    return "unknown";
  }

  const value = licenseUrl.toLowerCase();

  if (value.includes("publicdomain") || value.includes("public.domain") || value.includes("/cc0")) {
    return "public_domain";
  }

  if (value.includes("/by-sa/") || value.includes("by-sa")) {
    return "cc_by_sa";
  }

  if (value.includes("/by/") || value.includes("by/4") || value.includes("by/3")) {
    return "cc_by";
  }

  if (value.includes("nc")) {
    return "cc_nc";
  }

  if (value.includes("nd")) {
    return "cc_nd";
  }

  if (value.includes("creativecommons.org")) {
    return "cc_by";
  }

  return "unknown";
}

function inferGenre(subject: string | null) {
  if (!subject) {
    return null;
  }

  const lower = subject.toLowerCase();
  if (lower.includes("jazz")) return "jazz";
  if (lower.includes("rock")) return "rock";
  if (lower.includes("pop")) return "pop";
  if (lower.includes("classical") || lower.includes("orchestra") || lower.includes("symphony")) {
    return "classical";
  }

  return null;
}

function scoreQuality(input: {
  title: string;
  artistName: string;
  licenseUrl: string | null;
  durationSeconds: number;
}) {
  let score = 0.2;
  if (input.title.trim().length > 3) score += 0.25;
  if (input.artistName && input.artistName !== "Unknown artist") score += 0.25;
  if (input.licenseUrl) score += 0.2;
  if (input.durationSeconds >= 90 && input.durationSeconds <= 600) score += 0.1;
  return Math.min(1, score);
}

function parseDuration(value?: string) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return Math.floor(Number(trimmed));
  }

  const parts = trimmed.split(":").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  if (parts.length === 3) {
    return Math.floor(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  }

  if (parts.length === 2) {
    return Math.floor(parts[0] * 60 + parts[1]);
  }

  return null;
}

function firstString(value?: string | string[] | null) {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] ?? null : value;
}
