"use client";

import { useEffect, useRef, useState } from "react";

const AUDIO_SRC = "/assets/landing/boola-boola.mp3";

export function useBoolaBoolaPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let idleCallback: number | undefined;
    let timer: number | undefined;

    function preload() {
      const audio = new Audio(AUDIO_SRC);
      audio.preload = "auto";
      audio.loop = true;
      audio.load();
      audioRef.current = audio;
    }

    function schedule() {
      if (typeof window.requestIdleCallback === "function") {
        idleCallback = window.requestIdleCallback(preload, { timeout: 2000 });
      } else {
        timer = window.setTimeout(preload, 0);
      }
    }

    if (document.readyState === "complete") {
      schedule();
    } else {
      window.addEventListener("load", schedule, { once: true });
    }

    return () => {
      window.removeEventListener("load", schedule);
      if (idleCallback !== undefined) window.cancelIdleCallback(idleCallback);
      if (timer !== undefined) window.clearTimeout(timer);
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  function toggle() {
    setIsPlaying((playing) => {
      const next = !playing;
      if (!audioRef.current) {
        audioRef.current = new Audio(AUDIO_SRC);
        audioRef.current.loop = true;
      }
      if (next) {
        audioRef.current.currentTime = 0;
        void audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      return next;
    });
  }

  return { isPlaying, toggle };
}
