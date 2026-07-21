"use client";

import { useCallback, useEffect, useState } from "react";
import { Disc3, Search, Sprout } from "lucide-react";

import { HarvestPanel } from "@/components/harvest/harvest-panel";
import { IdentifyPanel } from "@/components/identify/identify-panel";
import { SoloMvpGame } from "@/components/solo-game/solo-mvp-game";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppMode = "solo" | "identify" | "harvest";

export function AppHome() {
  const [mode, setMode] = useState<AppMode>("solo");
  const [genres, setGenres] = useState<string[]>(["classical", "jazz", "pop", "rock"]);
  const [catalogTick, setCatalogTick] = useState(0);

  const refreshGenres = useCallback(() => {
    void fetch("/api/catalog")
      .then((response) => response.json())
      .then((payload: { genres?: string[] }) => {
        if (payload.genres?.length) {
          setGenres(payload.genres);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshGenres();
  }, [refreshGenres, catalogTick]);

  return (
    <div className="min-h-screen">
      <div className="border-b bg-card/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-primary">namethatbeat.com</p>
            <p className="text-sm text-muted-foreground">
              Practice, identify unknowns, or harvest CC/PD clips from the web.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={mode === "solo" ? "default" : "outline"}
              onClick={() => setMode("solo")}
              className={cn(mode === "solo" && "shadow-sm")}
            >
              <Disc3 className="h-4 w-4" />
              Solo practice
            </Button>
            <Button
              type="button"
              variant={mode === "identify" ? "default" : "outline"}
              onClick={() => setMode("identify")}
              className={cn(mode === "identify" && "shadow-sm")}
            >
              <Search className="h-4 w-4" />
              Identify unknown
            </Button>
            <Button
              type="button"
              variant={mode === "harvest" ? "default" : "outline"}
              onClick={() => setMode("harvest")}
              className={cn(mode === "harvest" && "shadow-sm")}
            >
              <Sprout className="h-4 w-4" />
              Harvest clips
            </Button>
          </div>
        </div>
      </div>

      {mode === "solo" ? (
        <SoloMvpGame key={catalogTick} />
      ) : mode === "identify" ? (
        <main className="px-4 py-8">
          <div className="mx-auto w-full max-w-5xl">
            <IdentifyPanel genres={genres} />
          </div>
        </main>
      ) : (
        <main className="px-4 py-8">
          <div className="mx-auto w-full max-w-5xl">
            <HarvestPanel
              genres={genres}
              onHarvested={() => {
                setCatalogTick((value) => value + 1);
                refreshGenres();
              }}
            />
          </div>
        </main>
      )}
    </div>
  );
}
