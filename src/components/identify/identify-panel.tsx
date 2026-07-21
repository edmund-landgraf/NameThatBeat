"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  LoaderCircle,
  Music2,
  RefreshCw,
  Upload,
  Vote
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSoundCloudPlayer } from "@/hooks/use-soundcloud-player";
import type { SampleCandidate, SampleSummary, UnknownSample } from "@/lib/samples/types";
import { pickAbPair } from "@/lib/samples/voting";
import { cn } from "@/lib/utils";

type IdentifyPanelProps = {
  genres: string[];
};

export function IdentifyPanel({ genres }: IdentifyPanelProps) {
  const [samples, setSamples] = useState<SampleSummary[]>([]);
  const [activeSample, setActiveSample] = useState<UnknownSample | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState(
    "Upload a clip Shazam (or another ID app) failed to recognize. NameThatBeat will gather candidates and let humans compare."
  );

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [genreHint, setGenreHint] = useState(genres[0] ?? "classical");
  const [source, setSource] = useState<"shazam_failed" | "other_id_failed" | "manual_clip">(
    "shazam_failed"
  );
  const [identifyLabel, setIdentifyLabel] = useState("");
  const [recentPairKeys, setRecentPairKeys] = useState<string[]>([]);
  const [pair, setPair] = useState<{ a: SampleCandidate; b: SampleCandidate; key: string } | null>(
    null
  );

  const candidateIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [listeningCandidate, setListeningCandidate] = useState<SampleCandidate | null>(null);

  const candidatePlayer = useSoundCloudPlayer({
    sourceUrl: listeningCandidate?.sourceUrl ?? null,
    iframeRef: candidateIframeRef
  });

  const leading = useMemo(() => {
    if (!activeSample?.leadingCandidateId) {
      return null;
    }

    return (
      activeSample.candidates.find((candidate) => candidate.id === activeSample.leadingCandidateId) ??
      null
    );
  }, [activeSample]);

  useEffect(() => {
    void refreshList();
  }, []);

  useEffect(() => {
    if (!activeSample || activeSample.candidates.length < 2) {
      setPair(null);
      return;
    }

    const next = pickAbPair(activeSample.candidates, recentPairKeys);
    setPair(next);
  }, [activeSample, recentPairKeys]);

  async function refreshList() {
    setIsLoadingList(true);
    setError(null);

    try {
      const response = await fetch("/api/samples");
      const payload = (await response.json()) as { samples?: SampleSummary[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load samples.");
      }

      setSamples(payload.samples ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load samples.");
    } finally {
      setIsLoadingList(false);
    }
  }

  async function openSample(id: string) {
    setError(null);

    try {
      const response = await fetch(`/api/samples/${id}`);
      const payload = (await response.json()) as { sample?: UnknownSample; error?: string };
      if (!response.ok || !payload.sample) {
        throw new Error(payload.error ?? "Sample not found.");
      }

      setActiveSample(payload.sample);
      setRecentPairKeys([]);
      setIdentifyLabel(payload.sample.identifiedLabel ?? "");
      setMessage(
        payload.sample.status === "identified"
          ? `Identified as ${payload.sample.identifiedLabel}.`
          : "Listen to the unknown clip, then vote which candidate is closer."
      );
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Could not open sample.");
    }
  }

  async function uploadSample(event: React.FormEvent) {
    event.preventDefault();
    if (!audioFile) {
      setError("Choose an audio file from the failed identification attempt.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const form = new FormData();
      form.set("audio", audioFile);
      form.set("notes", notes);
      form.set("genreHint", genreHint);
      form.set("source", source);

      const response = await fetch("/api/samples", { method: "POST", body: form });
      const payload = (await response.json()) as { sample?: UnknownSample; error?: string };

      if (!response.ok || !payload.sample) {
        throw new Error(payload.error ?? "Upload failed.");
      }

      setAudioFile(null);
      setNotes("");
      await refreshList();
      setActiveSample(payload.sample);
      setRecentPairKeys([]);
      setMessage(
        payload.sample.candidates.length >= 2
          ? "Clip uploaded. Candidates ready — play the unknown sample, then compare A vs B."
          : "Clip uploaded. Refresh candidates after connecting SoundCloud, or add richer notes."
      );
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  async function refreshCandidates() {
    if (!activeSample) {
      return;
    }

    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch(`/api/samples/${activeSample.id}/candidates`, { method: "POST" });
      const payload = (await response.json()) as { sample?: UnknownSample; error?: string };
      if (!response.ok || !payload.sample) {
        throw new Error(payload.error ?? "Could not refresh candidates.");
      }

      setActiveSample(payload.sample);
      setRecentPairKeys([]);
      await refreshList();
      setMessage("Candidate list refreshed from catalog / SoundCloud search.");
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Candidate refresh failed.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function castVote(choice: "a" | "b" | "neither" | "unsure") {
    if (!activeSample || !pair) {
      return;
    }

    setIsVoting(true);
    setError(null);

    try {
      const response = await fetch(`/api/samples/${activeSample.id}/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choice,
          candidateAId: pair.a.id,
          candidateBId: pair.b.id
        })
      });
      const payload = (await response.json()) as { sample?: UnknownSample; error?: string };
      if (!response.ok || !payload.sample) {
        throw new Error(payload.error ?? "Vote failed.");
      }

      setActiveSample(payload.sample);
      setRecentPairKeys((keys) => [...keys, pair.key].slice(-8));
      await refreshList();
      setMessage(
        choice === "neither"
          ? "Logged as neither. Next pair loaded."
          : `Vote recorded for option ${choice.toUpperCase()}. Next pair ready.`
      );
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : "Vote failed.");
    } finally {
      setIsVoting(false);
    }
  }

  async function markIdentified(candidateId?: string) {
    if (!activeSample) {
      return;
    }

    setError(null);

    try {
      const response = await fetch(`/api/samples/${activeSample.id}/identify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          candidateId ? { candidateId } : { label: identifyLabel.trim() || undefined }
        )
      });
      const payload = (await response.json()) as { sample?: UnknownSample; error?: string };
      if (!response.ok || !payload.sample) {
        throw new Error(payload.error ?? "Could not mark identified.");
      }

      setActiveSample(payload.sample);
      await refreshList();
      setMessage(`Marked identified: ${payload.sample.identifiedLabel}`);
    } catch (identifyError) {
      setError(identifyError instanceof Error ? identifyError.message : "Identify failed.");
    }
  }

  function playCandidate(candidate: SampleCandidate) {
    if (!candidate.sourceUrl) {
      setMessage("That candidate has no stream URL yet — compare by label/metadata for now.");
      return;
    }

    setListeningCandidate(candidate);
    setMessage(`Loading candidate: ${candidate.label}`);
  }

  useEffect(() => {
    if (!listeningCandidate?.sourceUrl || !candidatePlayer.ready) {
      return;
    }

    const result = candidatePlayer.playChunk(20, 8);
    if (!result.ok) {
      setMessage(result.error ?? "Candidate playback not ready.");
      return;
    }

    setMessage(`Playing candidate preview: ${listeningCandidate.label}`);
    // Intentionally depend on ready + candidate id only; playChunk is stable enough for this preview.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listeningCandidate?.id, listeningCandidate?.label, candidatePlayer.ready]);

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Submit unrecognized clip</CardTitle>
          <CardDescription>
            Drop the audio Shazam could not name. Add what you remember — genre, lyrics scraps, where
            you heard it — so NameThatBeat can propose candidates for human comparison.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3" onSubmit={uploadSample}>
            <label className="grid gap-2 text-sm">
              <span className="text-muted-foreground">Audio file</span>
              <input
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.aac"
                onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-foreground"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="text-muted-foreground">Failed service</span>
                <select
                  value={source}
                  onChange={(event) =>
                    setSource(event.target.value as "shazam_failed" | "other_id_failed" | "manual_clip")
                  }
                  className="h-11 rounded-md border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="shazam_failed">Shazam failed</option>
                  <option value="other_id_failed">Other ID app failed</option>
                  <option value="manual_clip">Manual mystery clip</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm">
                <span className="text-muted-foreground">Genre hint</span>
                <select
                  value={genreHint}
                  onChange={(event) => setGenreHint(event.target.value)}
                  className="h-11 rounded-md border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {(genres.length > 0 ? genres : ["classical", "jazz"]).map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                  <option value="pop">pop</option>
                  <option value="rock">rock</option>
                  <option value="hip-hop">hip-hop</option>
                  <option value="electronic">electronic</option>
                </select>
              </label>
            </div>

            <label className="grid gap-2 text-sm">
              <span className="text-muted-foreground">Notes / lyrics scraps / context</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="e.g. heard in a cafe, female vocal, 80s synth, lyric fragment 'never going back'"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isUploading || !audioFile}>
                {isUploading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload & find candidates
              </Button>
              <Badge variant="outline" className="rounded-md py-2">
                stored locally in .local/samples
              </Badge>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle>Open investigations</CardTitle>
            <CardDescription>Unrecognized clips waiting for human ears.</CardDescription>
            <Button variant="outline" size="default" onClick={refreshList} disabled={isLoadingList}>
              {isLoadingList ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {samples.length === 0 ? (
              <p className="text-sm text-muted-foreground">No samples yet. Upload a failed Shazam clip.</p>
            ) : (
              samples.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => openSample(sample.id)}
                  className={cn(
                    "w-full rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-secondary",
                    activeSample?.id === sample.id && "border-primary bg-primary/10"
                  )}
                >
                  <div className="font-semibold">{sample.originalFilename}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="secondary" className="rounded-md">
                      {sample.status}
                    </Badge>
                    <Badge variant="outline" className="rounded-md">
                      {sample.candidateCount} cand
                    </Badge>
                    <Badge variant="outline" className="rounded-md">
                      {sample.voteCount} votes
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>A/B identification</CardTitle>
                <CardDescription>
                  {activeSample
                    ? `${activeSample.originalFilename} · ${activeSample.source}`
                    : "Select a sample to verify candidates."}
                </CardDescription>
              </div>
              {activeSample ? (
                <Button variant="outline" onClick={refreshCandidates} disabled={isRefreshing}>
                  {isRefreshing ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh candidates
                </Button>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {!activeSample ? (
              <p className="text-sm text-muted-foreground">{message}</p>
            ) : (
              <>
                <div className="rounded-md border bg-secondary p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Music2 className="h-4 w-4 text-primary" />
                    Unknown sample
                  </div>
                  <audio
                    key={activeSample.id}
                    controls
                    className="w-full"
                    src={`/api/samples/${activeSample.id}/audio`}
                  />
                  {activeSample.notes ? (
                    <p className="mt-2 text-sm text-muted-foreground">Notes: {activeSample.notes}</p>
                  ) : null}
                  {leading ? (
                    <p className="mt-2 text-sm">
                      Leading candidate: <span className="font-semibold">{leading.label}</span> (
                      {Math.round(leading.score * 100)}%)
                    </p>
                  ) : null}
                </div>

                {pair ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {[pair.a, pair.b].map((candidate, index) => {
                      const side = index === 0 ? "a" : "b";
                      return (
                        <div key={candidate.id} className="rounded-md border p-3">
                          <Badge variant="outline" className="mb-2 rounded-md">
                            Option {side.toUpperCase()}
                          </Badge>
                          <p className="font-semibold">{candidate.label}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {candidate.discoverySource} · score {Math.round(candidate.score * 100)}% ·{" "}
                            {candidate.voteCount} votes
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => playCandidate(candidate)}
                              disabled={!candidate.sourceUrl}
                            >
                              Preview
                            </Button>
                            <Button
                              type="button"
                              onClick={() => castVote(side)}
                              disabled={isVoting || activeSample.status === "identified"}
                            >
                              <Vote className="h-4 w-4" />
                              Closer
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => markIdentified(candidate.id)}
                              disabled={activeSample.status === "identified"}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              This is it
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-amber-200">
                    Need at least two candidates. Add notes and refresh, or connect SoundCloud.
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!pair || isVoting || activeSample.status === "identified"}
                    onClick={() => castVote("neither")}
                  >
                    Neither
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!pair || isVoting || activeSample.status === "identified"}
                    onClick={() => castVote("unsure")}
                  >
                    Unsure
                  </Button>
                </div>

                <div className="grid gap-2 rounded-md border p-3">
                  <p className="text-sm font-semibold">Mark identified manually</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={identifyLabel}
                      onChange={(event) => setIdentifyLabel(event.target.value)}
                      placeholder="Artist - Title"
                      className="h-11 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <Button
                      type="button"
                      onClick={() => markIdentified()}
                      disabled={!identifyLabel.trim() || activeSample.status === "identified"}
                    >
                      Save ID
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">{message}</p>
              </>
            )}

            {error ? <p className="text-sm text-red-300">{error}</p> : null}
          </CardContent>
        </Card>
      </div>

      <div className="pointer-events-none absolute -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0">
        <iframe
          ref={candidateIframeRef}
          key={listeningCandidate?.id ?? "no-candidate"}
          title="Candidate SoundCloud player"
          className="h-px w-px border-0"
          allow="autoplay"
          tabIndex={-1}
          aria-hidden="true"
          src={
            listeningCandidate?.sourceUrl
              ? `https://w.soundcloud.com/player/?url=${encodeURIComponent(listeningCandidate.sourceUrl)}&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false`
              : "about:blank"
          }
        />
      </div>
    </div>
  );
}
