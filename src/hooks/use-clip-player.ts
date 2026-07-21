"use client";

import { useEffect, useRef, useState } from "react";

import { useSoundCloudPlayer } from "@/hooks/use-soundcloud-player";

type PlaybackMethod = "soundcloud_widget" | "html5_stream";

type UseClipPlayerArgs = {
  sourceUrl: string | null;
  playbackMethod: PlaybackMethod;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
};

export function useClipPlayer({ sourceUrl, playbackMethod, iframeRef }: UseClipPlayerArgs) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const [html5Ready, setHtml5Ready] = useState(false);
  const [html5Error, setHtml5Error] = useState<string | null>(null);

  const soundcloud = useSoundCloudPlayer({
    sourceUrl: playbackMethod === "soundcloud_widget" ? sourceUrl : null,
    iframeRef
  });

  useEffect(() => {
    if (playbackMethod !== "html5_stream" || !sourceUrl) {
      setHtml5Ready(false);
      setHtml5Error(null);
      return;
    }

    const audio = new Audio();
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;
    setHtml5Ready(false);
    setHtml5Error(null);

    const onCanPlay = () => {
      setHtml5Ready(true);
      setHtml5Error(null);
    };
    const onError = () => {
      setHtml5Ready(false);
      setHtml5Error("Could not load streamed audio from Internet Archive.");
    };

    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("error", onError);
    audio.src = sourceUrl;
    audio.load();

    return () => {
      audio.pause();
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("error", onError);
      audioRef.current = null;
      if (stopTimerRef.current) {
        window.clearTimeout(stopTimerRef.current);
      }
    };
  }, [playbackMethod, sourceUrl]);

  const ready = playbackMethod === "html5_stream" ? html5Ready : soundcloud.ready;
  const playbackError =
    playbackMethod === "html5_stream" ? html5Error : soundcloud.playbackError;

  function playChunk(startSeconds: number, durationSeconds: number) {
    if (playbackMethod === "html5_stream") {
      const audio = audioRef.current;
      if (!audio || !html5Ready) {
        return {
          ok: false,
          usedFallbackTone: false,
          error: html5Error ?? "Wait for the audio stream to finish loading."
        };
      }

      try {
        if (stopTimerRef.current) {
          window.clearTimeout(stopTimerRef.current);
        }

        audio.currentTime = Math.max(0, startSeconds);
        void audio.play();
        stopTimerRef.current = window.setTimeout(() => {
          audio.pause();
        }, durationSeconds * 1000);

        return { ok: true, usedFallbackTone: false };
      } catch {
        return {
          ok: false,
          usedFallbackTone: false,
          error: "HTML5 playback failed."
        };
      }
    }

    return soundcloud.playChunk(startSeconds, durationSeconds);
  }

  function pause() {
    if (playbackMethod === "html5_stream") {
      audioRef.current?.pause();
      if (stopTimerRef.current) {
        window.clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
      return;
    }

    soundcloud.pause();
  }

  return {
    ready,
    playbackError,
    playChunk,
    pause
  };
}
