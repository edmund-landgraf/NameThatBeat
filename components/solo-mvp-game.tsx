"use client";

import { useMemo, useState } from "react";
import { Music2, Play, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Choice = {
  letter: string;
  id: string;
  label: string;
};

const correctTrackId = "vivaldi_summer";
const maxPoints = 100;

const choices: Choice[] = [
  { letter: "A", id: "beethoven_5", label: "Beethoven - Symphony No. 5 - I. Allegro con brio" },
  { letter: "B", id: "vivaldi_summer", label: "Vivaldi - The Four Seasons - Summer" },
  { letter: "C", id: "mozart_nachtmusik", label: "Mozart - Eine kleine Nachtmusik - I. Allegro" },
  { letter: "D", id: "bach_toccata", label: "Bach - Toccata and Fugue in D minor" },
  { letter: "E", id: "brubeck_take_five", label: "Dave Brubeck Quartet - Time Out - Take Five" },
  { letter: "F", id: "miles_so_what", label: "Miles Davis - Kind of Blue - So What" },
  { letter: "G", id: "ellington_a_train", label: "Duke Ellington - Take the A Train" },
  { letter: "H", id: "coltrane_giant_steps", label: "John Coltrane - Giant Steps - Giant Steps" }
];

const chunk = {
  sourceName: "SoundCloud",
  sourceUrl: "https://soundcloud.com/portlandchambermusicfest/vivaldi-four-seasons-summer",
  startSeconds: 64,
  durationSeconds: 10
};

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatWindow(startSeconds: number, endSeconds: number) {
  return `${formatTime(startSeconds)}-${formatTime(endSeconds)}`;
}

export function SoloMvpGame() {
  const [started, setStarted] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [points, setPoints] = useState(0);
  const [lastWrongId, setLastWrongId] = useState<string | null>(null);
  const [message, setMessage] = useState("No answer yet.");

  const chunkWindow = useMemo(
    () => formatWindow(chunk.startSeconds, chunk.startSeconds + chunk.durationSeconds),
    []
  );

  function startGame() {
    setStarted(true);
    setAnswered(false);
    setWrongGuesses(0);
    setPoints(0);
    setLastWrongId(null);
    setMessage("Loaded Vivaldi - The Four Seasons - Summer. Choose the matching track.");
  }

  function answer(choice: Choice) {
    if (!started || answered) return;

    if (choice.id === correctTrackId) {
      const earned = Math.max(0, maxPoints - wrongGuesses * 15);
      setAnswered(true);
      setPoints(earned);
      setMessage(`Correct: ${choice.label}.`);
      return;
    }

    setWrongGuesses((value) => value + 1);
    setLastWrongId(choice.id);
    setMessage(`${choice.letter} is not correct. Try again.`);
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto grid w-full max-w-5xl gap-4">
        <header className="flex flex-col gap-4 rounded-md border bg-card p-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-primary">namethatbeat.com</p>
            <h1 className="mt-1 text-4xl font-bold leading-none md:text-6xl">Name That Beat</h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              MVP checkpoint: one track, one 10-second chunk, eight choices.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Badge variant="secondary" className="justify-center rounded-md py-2">
              8 choices
            </Badge>
            <Badge variant="outline" className="justify-center rounded-md py-2">
              10 seconds
            </Badge>
          </div>
        </header>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Vivaldi - The Four Seasons - Summer</CardTitle>
                <CardDescription>
                  Source target: {chunk.sourceName}, {chunkWindow}, 128 kbps or better.
                </CardDescription>
              </div>
              <Button onClick={startGame} size="lg">
                <Play className="h-4 w-4" />
                Start Game
              </Button>
            </div>
            <div className="rounded-md border bg-secondary p-4">
              <div className="flex items-start gap-3">
                <Music2 className="mt-1 h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold">
                    {started ? `Loaded and played ${chunkWindow}` : "Press Start Game"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {started
                      ? "The 10-second chunk is ready. Pick A, B, C, D, E, F, G, or H."
                      : "The round will load one Vivaldi Summer chunk and enable the answer choices."}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              {choices.map((choice) => {
                const isCorrect = answered && choice.id === correctTrackId;
                const isLastWrong = lastWrongId === choice.id && !answered;
                return (
                  <Button
                    key={choice.id}
                    variant="outline"
                    className={cn(
                      "h-auto justify-start whitespace-normal px-3 py-3 text-left",
                      isCorrect && "border-green-400 bg-green-400/15 text-green-100",
                      isLastWrong && "border-red-400 bg-red-400/15 text-red-100"
                    )}
                    disabled={!started || answered}
                    onClick={() => answer(choice)}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                      {choice.letter}
                    </span>
                    <span>{choice.label}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-4 p-5 md:grid-cols-[160px_1fr] md:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <span className="text-4xl font-bold">{points}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Points earned</p>
            </div>
            <p className="text-sm text-muted-foreground">{message}</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
