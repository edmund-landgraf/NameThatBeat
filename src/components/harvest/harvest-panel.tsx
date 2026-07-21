"use client";

import { useState } from "react";
import { LoaderCircle, Sprout } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type HarvestPanelProps = {
  genres: string[];
  onHarvested?: () => void;
};

export function HarvestPanel({ genres, onHarvested }: HarvestPanelProps) {
  const [genre, setGenre] = useState(genres[0] ?? "classical");
  const [count, setCount] = useState(6);
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState(
    "Pull Creative Commons / public-domain audio from the Internet Archive into the solo catalog."
  );
  const [error, setError] = useState<string | null>(null);
  const [lastAccepted, setLastAccepted] = useState<number | null>(null);

  async function runHarvest() {
    setIsRunning(true);
    setError(null);

    try {
      const response = await fetch("/api/harvest/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre, difficulty: "easy", count })
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        accepted?: number;
        fetched?: number;
        message?: string;
        warnings?: string[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Harvest failed.");
      }

      setLastAccepted(payload.accepted ?? 0);
      setMessage(
        payload.message ??
          `Fetched ${payload.fetched ?? 0}, accepted ${payload.accepted ?? 0}.`
      );
      if (payload.warnings?.length) {
        setMessage(`${payload.message ?? "Harvest finished."} ${payload.warnings[0]}`);
      }

      onHarvested?.();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Harvest failed.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Harvest web clips</CardTitle>
        <CardDescription>
          Rights-filtered Internet Archive search. Accepted tracks stream in solo via HTML5 (no
          SoundCloud required).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-2 text-sm">
            <span className="text-muted-foreground">Genre</span>
            <select
              value={genre}
              onChange={(event) => setGenre(event.target.value)}
              className="h-11 rounded-md border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {(genres.length ? genres : ["classical", "jazz", "pop", "rock"]).map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span className="text-muted-foreground">Target new tracks</span>
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(event) => setCount(Number(event.target.value) || 6)}
              className="h-11 rounded-md border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <div className="flex items-end">
            <Button type="button" onClick={runHarvest} disabled={isRunning} className="w-full">
              {isRunning ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Sprout className="h-4 w-4" />
              )}
              Run harvest
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="rounded-md py-2">
            provider: internet archive
          </Badge>
          <Badge variant="outline" className="rounded-md py-2">
            rights: PD / CC BY / CC BY-SA
          </Badge>
          {lastAccepted !== null ? (
            <Badge variant="default" className="rounded-md py-2">
              last accepted {lastAccepted}
            </Badge>
          ) : null}
        </div>

        <p className="text-sm text-muted-foreground">{message}</p>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
