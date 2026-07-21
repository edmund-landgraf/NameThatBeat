"use client";

import { useEffect, useRef, useState } from "react";

type SoundCloudWidget = {
  bind: (eventName: string, callback: () => void) => void;
  seekTo: (milliseconds: number) => void;
  play: () => void;
  pause: () => void;
};

declare global {
  interface Window {
    SC?: {
      Widget: (iframe: HTMLIFrameElement) => SoundCloudWidget;
    };
  }
}

type UseSoundCloudPlayerArgs = {
  sourceUrl: string | null;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
};

export type PlayChunkResult = {
  ok: boolean;
  usedFallbackTone: boolean;
  error?: string;
};

export function useSoundCloudPlayer({ sourceUrl, iframeRef }: UseSoundCloudPlayerArgs) {
  const widgetRef = useRef<SoundCloudWidget | null>(null);
  const fallbackAudioRef = useRef<AudioContext | null>(null);
  const fallbackOscillatorRef = useRef<OscillatorNode | null>(null);
  const [ready, setReady] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  useEffect(() => {
    if (!sourceUrl || !iframeRef.current) {
      setReady(false);
      widgetRef.current = null;
      return;
    }

    let cancelled = false;
    let timeoutId: number | null = null;

    const ensureScript = () =>
      new Promise<void>((resolve, reject) => {
        const existingScript = document.querySelector<HTMLScriptElement>(
          'script[src="https://w.soundcloud.com/player/api.js"]'
        );

        if (window.SC?.Widget) {
          resolve();
          return;
        }

        if (existingScript) {
          existingScript.addEventListener("load", () => resolve(), { once: true });
          existingScript.addEventListener("error", () => reject(new Error("SoundCloud script failed")), {
            once: true
          });
          return;
        }

        const script = document.createElement("script");
        script.src = "https://w.soundcloud.com/player/api.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("SoundCloud script failed to load"));
        document.body.appendChild(script);
      });

    setReady(false);
    setPlaybackError(null);
    widgetRef.current = null;

    ensureScript()
      .then(() => {
        if (cancelled || !iframeRef.current || !window.SC) {
          return;
        }

        const widget = window.SC.Widget(iframeRef.current);
        widgetRef.current = widget;
        timeoutId = window.setTimeout(() => {
          if (!cancelled) {
            setReady(false);
            setPlaybackError("SoundCloud player timed out. Wait or reload the track.");
          }
        }, 12000);

        widget.bind("ready", () => {
          if (cancelled) {
            return;
          }

          if (timeoutId) {
            window.clearTimeout(timeoutId);
          }

          setReady(true);
          setPlaybackError(null);
        });
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setReady(false);
          setPlaybackError(error.message);
        }
      });

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [iframeRef, sourceUrl]);

  useEffect(() => {
    return () => {
      stopTone();
      fallbackAudioRef.current?.close().catch(() => undefined);
    };
  }, []);

  function playChunk(
    startSeconds: number,
    durationSeconds: number,
    options?: { allowFallbackTone?: boolean }
  ): PlayChunkResult {
    const widget = widgetRef.current;
    const allowFallbackTone = options?.allowFallbackTone === true;

    if (widget && ready) {
      try {
        widget.seekTo(startSeconds * 1000);
        widget.play();
        return { ok: true, usedFallbackTone: false };
      } catch {
        if (allowFallbackTone) {
          startFallbackTone(durationSeconds);
          return { ok: true, usedFallbackTone: true };
        }

        return {
          ok: false,
          usedFallbackTone: false,
          error: "SoundCloud playback failed. Try Play again."
        };
      }
    }

    if (allowFallbackTone) {
      startFallbackTone(durationSeconds);
      return { ok: true, usedFallbackTone: true };
    }

    return {
      ok: false,
      usedFallbackTone: false,
      error: playbackError ?? "Wait for the SoundCloud player to finish loading."
    };
  }

  function pause() {
    widgetRef.current?.pause();
    stopTone();
  }

  function startFallbackTone(durationSeconds: number) {
    try {
      stopTone();
      const context = fallbackAudioRef.current ?? new window.AudioContext();
      fallbackAudioRef.current = context;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      fallbackOscillatorRef.current = oscillator;
      oscillator.frequency.value = 220;
      gain.gain.value = 0.025;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + durationSeconds);
    } catch {
      // Ignore browsers that block Web Audio.
    }
  }

  function stopTone() {
    try {
      fallbackOscillatorRef.current?.stop();
    } catch {
      // Already stopped.
    }

    fallbackOscillatorRef.current = null;
  }

  return {
    ready,
    playbackError,
    playChunk,
    pause
  };
}
