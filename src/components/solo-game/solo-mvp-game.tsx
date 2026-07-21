"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  LoaderCircle,
  LogIn,
  LogOut,
  Music2,
  Play,
  SkipForward,
  Square,
  Trophy
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useClipPlayer } from "@/hooks/use-clip-player";
import type { SeedDifficulty, SoloGameSet, SoloRoundTrack } from "@/lib/catalog/types";
import {
  CHOICE_COUNT,
  CLIP_DURATION_LADDER_SECONDS,
  clipDurationForPlayIndex,
  MAX_WRONG_GUESSES,
  scoreForFreeTextGuess,
  scoreForWrongGuesses,
  TARGET_SET_SIZE
} from "@/lib/game/scoring";
import { readSoloStats, recordSoloSetFinish, type SoloLocalStats } from "@/lib/game/local-stats";
import { isCorrectTitleGuess } from "@/lib/game/title-match";
import { getUsedWindows, recordUsedWindow } from "@/lib/game/window-history";
import { filterNonOverlappingWindows } from "@/lib/game/windows";
import { cn } from "@/lib/utils";

type SoundCloudAuthStatus = {
  configured: boolean;
  connected: boolean;
  usingEnvToken: boolean;
  redirectUri: string;
  expiresAt: number | null;
};

type CatalogSummary = {
  genres: string[];
  difficulties: SeedDifficulty[];
  trackCount: number;
};

type RoundResult = {
  trackId: string;
  label: string;
  points: number;
  wrongGuesses: number;
  skipped: boolean;
  namedByText?: boolean;
  selectedChoiceId?: string | null;
};

export function SoloMvpGame() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);
  const activeSetIdRef = useRef<string | null>(null);

  const [genre, setGenre] = useState("classical");
  const [difficulty, setDifficulty] = useState<SeedDifficulty>("easy");
  const [catalog, setCatalog] = useState<CatalogSummary | null>(null);
  const [authStatus, setAuthStatus] = useState<SoundCloudAuthStatus | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isLoadingSet, setIsLoadingSet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameSet, setGameSet] = useState<SoloGameSet | null>(null);
  const [pendingSet, setPendingSet] = useState<SoloGameSet | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [phase, setPhase] = useState<"setup" | "confirm" | "playing" | "complete">("setup");
  const [results, setResults] = useState<RoundResult[]>([]);

  const [answered, setAnswered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [canPlay, setCanPlay] = useState(false);
  const [hasPlayableChunk, setHasPlayableChunk] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [wrongChoiceIds, setWrongChoiceIds] = useState<string[]>([]);
  const [activeChunkIndex, setActiveChunkIndex] = useState<number | null>(null);
  const [nextChunkIndex, setNextChunkIndex] = useState(0);
  const [playsThisRound, setPlaysThisRound] = useState(0);
  const [activeClipSeconds, setActiveClipSeconds] = useState<number | null>(null);
  const [roundPoints, setRoundPoints] = useState(0);
  const [message, setMessage] = useState("Pick a genre and difficulty, then start a 5-track set.");
  const [titleGuess, setTitleGuess] = useState("");
  const [showChoices, setShowChoices] = useState(false);
  const [textGuessFeedback, setTextGuessFeedback] = useState<string | null>(null);
  const [stats, setStats] = useState<SoloLocalStats>({
    currentStreak: 0,
    bestStreak: 0,
    highScore: 0,
    setsPlayed: 0,
    lastSetScore: 0,
    updatedAt: null
  });

  const currentRound: SoloRoundTrack | null = gameSet?.rounds[roundIndex] ?? null;
  const chunkWindows = useMemo(() => {
    if (!currentRound) {
      return [];
    }

    return filterNonOverlappingWindows(currentRound.chunkWindows, getUsedWindows(currentRound.sourceUrl));
  }, [currentRound]);

  const nextChunk = chunkWindows[nextChunkIndex % (chunkWindows.length || 1)] ?? null;
  const nextClipSeconds = clipDurationForPlayIndex(playsThisRound);
  const activeHint = currentRound?.narrativeHints?.[0] ?? null;
  const totalScore = results.reduce((sum, result) => sum + result.points, 0);

  const player = useClipPlayer({
    sourceUrl: currentRound?.sourceUrl ?? null,
    playbackMethod: currentRound?.playbackMethod ?? "soundcloud_widget",
    iframeRef
  });

  useEffect(() => {
    setStats(readSoloStats());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function refreshCatalog() {
      try {
        const response = await fetch(`/api/catalog?genre=${encodeURIComponent(genre)}`);
        const payload = (await response.json()) as CatalogSummary & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load catalog.");
        }

        if (!cancelled) {
          setCatalog(payload);

          if (payload.difficulties.length > 0 && !payload.difficulties.includes(difficulty)) {
            setDifficulty(payload.difficulties[0]);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load catalog.");
        }
      }
    }

    void refreshCatalog();

    return () => {
      cancelled = true;
    };
  }, [genre, difficulty]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAuth() {
      try {
        const response = await fetch("/api/soundcloud/auth/status");
        if (!cancelled) {
          setAuthStatus((await response.json()) as SoundCloudAuthStatus);
        }
      } catch {
        if (!cancelled) {
          setAuthStatus(null);
        }
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get("soundcloud") === "connected") {
        setMessage("SoundCloud connected. Start a set to resolve catalog audio.");
        window.history.replaceState({}, "", window.location.pathname);
      }

      const authError = params.get("soundcloud_error");
      if (authError) {
        setError(authError);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }

    void bootstrapAuth();

    return () => {
      cancelled = true;
      clearTransitionTimeout();
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  function clearTransitionTimeout() {
    if (transitionTimeoutRef.current) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  }

  async function disconnectSoundCloud() {
    setIsDisconnecting(true);

    try {
      await fetch("/api/soundcloud/auth/disconnect", { method: "POST" });
      const response = await fetch("/api/soundcloud/auth/status");
      setAuthStatus((await response.json()) as SoundCloudAuthStatus);
      setMessage("SoundCloud disconnected. Approved seed sources can still start a smaller set.");
    } finally {
      setIsDisconnecting(false);
    }
  }

  async function startSet() {
    setIsLoadingSet(true);
    setError(null);
    clearTransitionTimeout();

    try {
      const response = await fetch(
        `/api/game/solo-set?genre=${encodeURIComponent(genre)}&difficulty=${encodeURIComponent(difficulty)}&setSize=${TARGET_SET_SIZE}`
      );
      const payload = (await response.json()) as SoloGameSet & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not build a solo set.");
      }

      stopPlayback();
      setResults([]);
      setRoundIndex(0);
      setGameSet(null);
      activeSetIdRef.current = null;

      if (payload.isReducedSet) {
        setPendingSet(payload);
        setPhase("confirm");
        setMessage(
          payload.warnings[0] ??
            `Only ${payload.trackCount} of ${payload.targetTrackCount} tracks are playable. Confirm to continue.`
        );
        return;
      }

      beginSet(payload);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Could not build a solo set.");
      setPhase("setup");
      setGameSet(null);
      setPendingSet(null);
    } finally {
      setIsLoadingSet(false);
    }
  }

  function beginSet(nextSet: SoloGameSet) {
    clearTransitionTimeout();
    activeSetIdRef.current = nextSet.setId;
    setPendingSet(null);
    setGameSet(nextSet);
    setResults([]);
    setRoundIndex(0);
    setPhase("playing");
    resetRoundState(
      `Set ready (${nextSet.trackCount} track${nextSet.trackCount === 1 ? "" : "s"} via ${nextSet.source}). Wait for the player, then Play.`
    );
  }

  function cancelPendingSet() {
    setPendingSet(null);
    setPhase("setup");
    setMessage("Reduced set cancelled. Connect SoundCloud or pick another genre.");
  }

  function resetRoundState(nextMessage: string) {
    stopPlayback();
    setAnswered(false);
    setIsPlaying(false);
    setCanPlay(true);
    setHasPlayableChunk(false);
    setCountdown(null);
    setWrongGuesses(0);
    setWrongChoiceIds([]);
    setActiveChunkIndex(null);
    setNextChunkIndex(0);
    setPlaysThisRound(0);
    setActiveClipSeconds(null);
    setRoundPoints(0);
    setTitleGuess("");
    setShowChoices(false);
    setTextGuessFeedback(null);
    setMessage(nextMessage);
  }

  function stopSet() {
    clearTransitionTimeout();
    activeSetIdRef.current = null;
    stopPlayback();
    setPhase("setup");
    setGameSet(null);
    setPendingSet(null);
    setRoundIndex(0);
    setResults([]);
    setCanPlay(false);
    setHasPlayableChunk(false);
    setMessage("Set stopped. Choose genre and difficulty to start again.");
  }

  function playTrack() {
    if (
      phase !== "playing" ||
      answered ||
      isPlaying ||
      !canPlay ||
      !currentRound ||
      !nextChunk ||
      !player.ready
    ) {
      if (phase === "playing" && !player.ready) {
        setMessage(player.playbackError ?? "Wait for the SoundCloud player to finish loading.");
      }
      return;
    }

    const currentIndex = nextChunkIndex % chunkWindows.length;
    const currentChunk = chunkWindows[currentIndex];
    const clipSeconds = clipDurationForPlayIndex(playsThisRound);

    const result = player.playChunk(currentChunk.startSeconds, clipSeconds);
    if (!result.ok) {
      setMessage(result.error ?? "Playback is not ready yet.");
      return;
    }

    setIsPlaying(true);
    setCanPlay(false);
    setHasPlayableChunk(true);
    setCountdown(clipSeconds);
    setActiveClipSeconds(clipSeconds);
    setActiveChunkIndex(currentIndex);
    setNextChunkIndex((value) => (value + 1) % chunkWindows.length);
    setPlaysThisRound((value) => value + 1);
    setMessage(
      clipSeconds <= 3
        ? `Short clip (${clipSeconds}s). Name it early for full points.`
        : "Listening... choose an answer during or after playback."
    );
    recordUsedWindow(currentRound.sourceUrl, currentChunk.startSeconds, clipSeconds);

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }

    let remaining = clipSeconds;
    timerRef.current = window.setInterval(() => {
      remaining -= 1;

      if (remaining <= 0) {
        stopPlayback();
        setMessage("Clip ended. Choose an answer — a wrong guess unlocks a longer clip.");
        return;
      }

      setCountdown(remaining);
    }, 1000);
  }

  function registerWrongGuess(options?: { choiceId?: string; fromText?: boolean }) {
    if (!currentRound) {
      return;
    }

    stopPlayback();
    const nextWrongGuesses = wrongGuesses + 1;
    setWrongGuesses(nextWrongGuesses);

    if (options?.choiceId) {
      setWrongChoiceIds((value) => [...value, options.choiceId as string]);
    }

    if (options?.fromText) {
      setShowChoices(true);
      setTextGuessFeedback("Not quite. Press Play for a longer clip, then choose or type again.");
    }

    if (nextWrongGuesses >= MAX_WRONG_GUESSES) {
      finishRound({
        trackId: currentRound.id,
        label: currentRound.label,
        points: 0,
        wrongGuesses: nextWrongGuesses,
        skipped: false
      });
      return;
    }

    setCanPlay(true);
    setHasPlayableChunk(false);
    const upcomingSeconds = clipDurationForPlayIndex(playsThisRound);
    setMessage(
      nextWrongGuesses >= 2 && activeHint
        ? `Wrong. Hint: ${activeHint} Next clip: ${upcomingSeconds}s.`
        : `Wrong. Press Play for a longer ${upcomingSeconds}s clip.`
    );
  }

  function submitTitleGuess() {
    if (phase !== "playing" || answered || !hasPlayableChunk || !currentRound) {
      return;
    }

    const trimmed = titleGuess.trim();
    if (!trimmed) {
      setTextGuessFeedback("Type a title (or composer + title), then submit.");
      return;
    }

    if (isCorrectTitleGuess(trimmed, currentRound)) {
      const points = scoreForFreeTextGuess(wrongGuesses);
      setTextGuessFeedback(null);
      finishRound({
        trackId: currentRound.id,
        label: currentRound.label,
        points,
        wrongGuesses,
        skipped: false,
        namedByText: true,
        selectedChoiceId: currentRound.id
      });
      return;
    }

    setTitleGuess("");
    registerWrongGuess({ fromText: true });
  }

  function revealChoices() {
    setShowChoices(true);
    setTextGuessFeedback("Choices revealed. You can still type a title for credit.");
    setMessage("Multiple-choice unlocked. Pick one or keep typing the title.");
  }

  function answer(choiceId: string) {
    if (phase !== "playing" || answered || !hasPlayableChunk || !currentRound) {
      return;
    }

    if (choiceId === currentRound.id) {
      const points = scoreForWrongGuesses(wrongGuesses);
      finishRound({
        trackId: currentRound.id,
        label: currentRound.label,
        points,
        wrongGuesses,
        skipped: false,
        namedByText: false,
        selectedChoiceId: choiceId
      });
      return;
    }

    registerWrongGuess({ choiceId });
  }

  function skipTrack() {
    if (!currentRound || phase !== "playing") {
      return;
    }

    finishRound({
      trackId: currentRound.id,
      label: currentRound.label,
      points: 0,
      wrongGuesses,
      skipped: true,
      selectedChoiceId: null
    });
  }

  function finishRound(result: RoundResult) {
    stopPlayback();
    setAnswered(true);
    setCanPlay(false);
    setRoundPoints(result.points);

    const nextResults = [...results, result];
    setResults(nextResults);

    const setId = gameSet?.setId ?? null;
    if (gameSet) {
      void fetch("/api/game/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setId: gameSet.setId,
          trackId: result.trackId,
          wrongGuesses: result.wrongGuesses,
          skipped: result.skipped,
          namedByText: Boolean(result.namedByText),
          selectedChoiceId: result.selectedChoiceId ?? null,
          genre: gameSet.genre,
          difficulty: gameSet.difficulty
        })
      }).catch(() => undefined);
    }

    const isLastRound = !gameSet || roundIndex >= gameSet.rounds.length - 1;

    if (isLastRound) {
      clearTransitionTimeout();
      const finalScore = nextResults.reduce((sum, entry) => sum + entry.points, 0);
      setStats(recordSoloSetFinish(finalScore));
      setPhase("complete");
      setMessage(
        result.skipped
          ? "Track skipped. Set complete."
          : `Round complete for ${result.points} points. Set finished.`
      );
      return;
    }

    setMessage(
      result.skipped
        ? "Track skipped. Loading next track..."
        : `Round scored ${result.points} points. Loading next track...`
    );

    clearTransitionTimeout();
    transitionTimeoutRef.current = window.setTimeout(() => {
      if (activeSetIdRef.current !== setId) {
        return;
      }

      setRoundIndex((value) => value + 1);
      resetRoundState(
        `Next track ready. Wait for the player, then Play (${CLIP_DURATION_LADDER_SECONDS[0]}s first clip).`
      );
    }, 900);
  }

  function stopPlayback() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    player.pause();
    setIsPlaying(false);
    setCountdown(0);
  }

  const choicesEnabled = phase === "playing" && hasPlayableChunk && !answered;
  const playDisabled =
    phase !== "playing" ||
    answered ||
    isPlaying ||
    !canPlay ||
    !currentRound ||
    !player.ready;

  return (
    <main className="px-4 py-8">
      <div className="mx-auto grid w-full max-w-5xl gap-4">
        <header className="flex flex-col gap-4 rounded-md border bg-card p-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Solo practice</p>
            <h1 className="mt-1 text-4xl font-bold leading-none md:text-6xl">Name That Beat</h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Solo MVP: pick genre and difficulty, play a {TARGET_SET_SIZE}-track set, type the title
              (or use {CHOICE_COUNT} choices). Clips start at {CLIP_DURATION_LADDER_SECONDS[0]}s and grow
              after wrong guesses.
            </p>
          </div>
          {phase === "playing" ? (
            <Button onClick={stopSet} size="lg" className="md:mt-1" variant="secondary">
              <Square className="h-4 w-4" />
              End Set
            </Button>
          ) : phase === "confirm" && pendingSet ? (
            <div className="flex gap-2 md:mt-1">
              <Button onClick={cancelPendingSet} variant="outline" size="lg">
                Cancel
              </Button>
              <Button onClick={() => beginSet(pendingSet)} size="lg">
                <Play className="h-4 w-4" />
                Play {pendingSet.trackCount}-Track Set
              </Button>
            </div>
          ) : (
            <Button onClick={startSet} size="lg" className="md:mt-1" disabled={isLoadingSet || phase === "confirm"}>
              {isLoadingSet ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start {TARGET_SET_SIZE}-Track Set
            </Button>
          )}
        </header>

        <Card>
          <CardHeader className="space-y-4">
            <div>
              <CardTitle>Solo Setup</CardTitle>
              <CardDescription>
                Catalog-driven sets. SoundCloud resolves missing seed audio when connected.
              </CardDescription>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="text-muted-foreground">Genre</span>
                <select
                  value={genre}
                  disabled={phase === "playing"}
                  onChange={(event) => setGenre(event.target.value)}
                  className="h-11 rounded-md border border-input bg-background px-3 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {(catalog?.genres ?? ["classical", "jazz"]).map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm">
                <span className="text-muted-foreground">Difficulty</span>
                <select
                  value={difficulty}
                  disabled={phase === "playing"}
                  onChange={(event) => setDifficulty(event.target.value as SeedDifficulty)}
                  className="h-11 rounded-md border border-input bg-background px-3 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {(catalog?.difficulties ?? ["easy"]).map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-md py-2">
                {catalog?.trackCount ?? 0} catalog tracks
              </Badge>
              <Badge variant="outline" className="rounded-md py-2">
                {CHOICE_COUNT} choices
              </Badge>
              <Badge variant="outline" className="rounded-md py-2">
                {TARGET_SET_SIZE}-track sets
              </Badge>
              <Badge variant="outline" className="rounded-md py-2">
                streak {stats.currentStreak} · best {stats.bestStreak}
              </Badge>
              <Badge variant="outline" className="rounded-md py-2">
                high score {stats.highScore}
              </Badge>
              <Badge variant={authStatus?.connected ? "default" : "secondary"} className="rounded-md py-2">
                {authStatus?.connected
                  ? "SoundCloud connected"
                  : authStatus?.configured
                    ? "SoundCloud ready to connect"
                    : "SoundCloud not configured"}
              </Badge>
              {gameSet ? (
                <Badge variant="default" className="rounded-md py-2">
                  source: {gameSet.source}
                </Badge>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 rounded-md border bg-secondary p-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                Connect SoundCloud so catalog tracks without approved URLs can be resolved for playback.
                Distractors come from the seed catalog and do not need audio.
              </p>
              <div className="flex shrink-0 gap-2">
                {authStatus?.configured && !authStatus.connected ? (
                  <Button asChild>
                    <a href="/api/soundcloud/auth/start">
                      <LogIn className="h-4 w-4" />
                      Connect
                    </a>
                  </Button>
                ) : (
                  <Button type="button" disabled>
                    <LogIn className="h-4 w-4" />
                    Connect
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={disconnectSoundCloud}
                  disabled={!authStatus?.connected || authStatus?.usingEnvToken || isDisconnecting}
                >
                  {isDisconnecting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  Disconnect
                </Button>
              </div>
            </div>

            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            {gameSet?.warnings.map((warning) => (
              <p key={warning} className="text-sm text-amber-200">
                {warning}
              </p>
            ))}
          </CardHeader>
        </Card>

        {phase === "confirm" && pendingSet ? (
          <Card>
            <CardHeader>
              <CardTitle>Reduced set available</CardTitle>
              <CardDescription>
                Only {pendingSet.trackCount} of {pendingSet.targetTrackCount} tracks have verified
                playable audio for {pendingSet.genre} / {pendingSet.difficulty}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {pendingSet.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">
                Connect SoundCloud to resolve more catalog tracks, or continue with this shorter set.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => beginSet(pendingSet)}>
                  <Play className="h-4 w-4" />
                  Continue with {pendingSet.trackCount} track
                  {pendingSet.trackCount === 1 ? "" : "s"}
                </Button>
                <Button variant="outline" onClick={cancelPendingSet}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {phase === "complete" && gameSet ? (
          <Card>
            <CardHeader>
              <CardTitle>Set Complete</CardTitle>
              <CardDescription>
                {gameSet.genre} / {gameSet.difficulty} · {results.length} tracks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Trophy className="h-6 w-6 text-primary" />
                <p className="text-3xl font-bold">{totalScore}</p>
                <span className="text-sm text-muted-foreground">total points</span>
                <Badge variant="outline" className="rounded-md py-2">
                  streak {stats.currentStreak}
                </Badge>
                <Badge variant="outline" className="rounded-md py-2">
                  best streak {stats.bestStreak}
                </Badge>
                <Badge variant="outline" className="rounded-md py-2">
                  all-time high {stats.highScore}
                </Badge>
              </div>
              <ul className="space-y-2 text-sm">
                {results.map((result) => (
                  <li
                    key={`${result.trackId}-${result.label}`}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <span>
                      {result.skipped
                        ? `${result.label} (skipped)`
                        : result.namedByText
                          ? `${result.label} (typed)`
                          : result.label}
                    </span>
                    <span className="font-semibold">{result.points}</span>
                  </li>
                ))}
              </ul>
              <Button onClick={startSet} disabled={isLoadingSet}>
                Play Another Set
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>
                  {phase === "playing" && gameSet
                    ? `Track ${roundIndex + 1} of ${gameSet.trackCount}`
                    : "Round"}
                </CardTitle>
                <CardDescription>
                  Name the title after the short clip. Miss or reveal choices for {CHOICE_COUNT}-option
                  fallback. Clips grow {CLIP_DURATION_LADDER_SECONDS.join("→")}s.
                </CardDescription>
              </div>
              <Button onClick={skipTrack} variant="secondary" size="lg" disabled={phase !== "playing" || answered}>
                <SkipForward className="h-4 w-4" />
                Skip Track
              </Button>
            </div>

            {phase === "playing" && currentRound && !hasPlayableChunk && !answered ? (
              <div className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
                <p className="font-semibold">Clue (before play)</p>
                <p className="mt-1 text-muted-foreground">{currentRound.prePlayClue}</p>
              </div>
            ) : null}

            <div className="rounded-md border bg-secondary p-4">
              <div className="flex items-start gap-3">
                <Music2 className="mt-1 h-5 w-5 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {phase === "playing" ? "Hidden track loaded" : "Start a set to begin"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {phase === "playing" && !player.ready
                      ? player.playbackError ??
                        (currentRound?.playbackMethod === "html5_stream"
                          ? "Loading streamed audio…"
                          : "Loading SoundCloud player…")
                      : player.playbackError && phase === "playing"
                        ? player.playbackError
                        : "Read the clue, then Play. Type the title — or reveal choices."}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge
                    variant={player.ready && phase === "playing" ? "default" : "outline"}
                    className="justify-center rounded-md py-2 text-sm"
                  >
                    {phase === "playing" && !player.ready
                      ? "loading"
                      : countdown === null
                        ? `${nextClipSeconds}s`
                        : `${countdown}s${activeClipSeconds ? ` / ${activeClipSeconds}s` : ""}`}
                  </Badge>
                  <Button onClick={playTrack} disabled={playDisabled} variant="outline">
                    <Play className="h-4 w-4" />
                    {phase === "playing" && !player.ready ? "Wait…" : "Play"}
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-md py-2">
                {showChoices || answered ? `${currentRound?.choices.length ?? CHOICE_COUNT} choices` : "name that title"}
              </Badge>
              <Badge variant="outline" className="rounded-md py-2">
                {wrongGuesses} wrong / {MAX_WRONG_GUESSES} max
              </Badge>
              <Badge variant="outline" className="rounded-md py-2">
                set score {totalScore}
              </Badge>
              {activeChunkIndex !== null ? (
                <Badge variant="outline" className="rounded-md py-2">
                  clip {activeChunkIndex + 1}
                </Badge>
              ) : null}
            </div>

            {phase === "playing" && hasPlayableChunk && !answered ? (
              <form
                className="mb-4 grid gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitTitleGuess();
                }}
              >
                <label className="grid gap-2 text-sm">
                  <span className="text-muted-foreground">Name that beat</span>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={titleGuess}
                      onChange={(event) => setTitleGuess(event.target.value)}
                      placeholder="Title or composer + title"
                      autoComplete="off"
                      className="h-11 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <Button type="submit" disabled={!choicesEnabled}>
                      Submit title
                    </Button>
                    {!showChoices ? (
                      <Button type="button" variant="secondary" onClick={revealChoices}>
                        <Eye className="h-4 w-4" />
                        Show choices
                      </Button>
                    ) : null}
                  </div>
                </label>
                {textGuessFeedback ? (
                  <p className="text-sm text-amber-200">{textGuessFeedback}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Free-text correct answers score the same as picking the right choice. A wrong title
                    opens the multiple-choice list.
                  </p>
                )}
              </form>
            ) : null}

            {wrongGuesses >= 2 && activeHint && !answered && phase === "playing" ? (
              <div className="mb-3 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
                Hint: {activeHint}
              </div>
            ) : null}

            {showChoices || answered ? (
              <div className="grid gap-2 md:grid-cols-2">
                {(currentRound?.choices ?? []).map((choice, index) => {
                  const isCorrect = answered && choice.id === currentRound?.id;
                  const isWrong = wrongChoiceIds.includes(choice.id);
                  const letter = String.fromCharCode(65 + index);

                  return (
                    <Button
                      key={`${choice.id}-${index}`}
                      variant="outline"
                      className={cn(
                        "h-auto justify-start whitespace-normal px-3 py-3 text-left",
                        isCorrect && "border-green-400 bg-green-400/15 text-green-100",
                        isWrong && "border-red-400 bg-red-400/15 text-red-100"
                      )}
                      disabled={!choicesEnabled || isWrong}
                      onClick={() => answer(choice.id)}
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                        {letter}
                      </span>
                      <span>{choice.label}</span>
                    </Button>
                  );
                })}
              </div>
            ) : phase === "playing" && hasPlayableChunk ? (
              <p className="text-sm text-muted-foreground">
                Multiple-choice stays hidden until you miss a title guess or press Show choices.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-4 p-5 md:grid-cols-[160px_1fr] md:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <span className="text-4xl font-bold">
                  {phase === "complete" ? totalScore : answered ? roundPoints : totalScore}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {phase === "complete" ? "Final score" : answered ? "Round points" : "Set score"}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">{message}</p>
          </CardContent>
        </Card>
      </div>

      <div className="pointer-events-none absolute -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0">
        <iframe
          ref={iframeRef}
          key={currentRound?.id ?? "empty-track"}
          title="Hidden SoundCloud audio player"
          className="h-px w-px border-0"
          allow="autoplay"
          tabIndex={-1}
          aria-hidden="true"
          src={
            currentRound
              ? `https://w.soundcloud.com/player/?url=${encodeURIComponent(currentRound.sourceUrl)}&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false`
              : "about:blank"
          }
        />
      </div>
    </main>
  );
}
