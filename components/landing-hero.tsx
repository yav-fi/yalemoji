"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, type CSSProperties } from "react";
import { DraggableSticker } from "./draggable-sticker";
import { useBoardPhysics } from "./use-board-physics";
import { MedalTug } from "./medal-tug";
import { useBoolaBoolaPlayer } from "./use-boola-boola-player";
import styles from "./landing-hero.module.css";

type Placement = { x: string; y: string; w: string; h: string; delay: string };

function coreStyle(placement: Placement): CSSProperties {
  return {
    "--x": placement.x,
    "--y": placement.y,
    "--w": placement.w,
    "--h": placement.h,
    "--delay": placement.delay
  } as CSSProperties;
}

const PLACEMENT = {
  wordmark: { x: "33.889%", y: "28.111%", w: "32.285%", h: "14.111%", delay: "0s" },
  cta: { x: "40.347%", y: "49%", w: "19.236%", h: "7.111%", delay: "0.72s" },
  tugText: { x: "18.542%", y: "11.778%", w: "8.125%", h: "6.111%", delay: "0s" },
  star: { x: "55.833%", y: "13.757%", w: "8.032%", h: "12.851%", delay: "0.45s" },
  medal: { x: "-9.375%", y: "-4.333%", w: "32.786%", h: "52.457%", delay: "0.63s" },
  stickyNote: { x: "7.431%", y: "55.556%", w: "22.251%", h: "35.602%", delay: "0.09s" },
  avatarStarEyes: { x: "79.783%", y: "34.849%", w: "17.481%", h: "27.969%", delay: "0.36s" },
  avatarDarkHair: { x: "72.014%", y: "73.333%", w: "15.139%", h: "24.222%", delay: "0.18s" },
  avatarBoy: { x: "48.403%", y: "64.667%", w: "14.583%", h: "23.333%", delay: "0.27s" },
  soundCluster: { x: "78.681%", y: "18.333%", w: "6.389%", h: "5.96%", delay: "0.54s" }
} as const satisfies Record<string, Placement>;

const SOUND_BARS = [
  { left: "52.17%", top: "18.64%", height: "50.34%", duration: "0.8s", delay: "0s" },
  { left: "100%", top: "18.64%", height: "50.34%", duration: "0.95s", delay: "0.1s" },
  { left: "64.13%", top: "5.59%", height: "76.44%", duration: "0.7s", delay: "0.05s" },
  { left: "88.04%", top: "5.59%", height: "76.44%", duration: "1.05s", delay: "0.15s" },
  { left: "76.09%", top: "27.96%", height: "31.69%", duration: "0.85s", delay: "0.2s" }
];

const BUMP_DURATION_MS = 500;

export function LandingHero() {
  const stageRef = useBoardPhysics();
  const [tugCount, setTugCount] = useState(0);
  const { isPlaying, toggle: toggleAirpod } = useBoolaBoolaPlayer();
  const [bumping, setBumping] = useState(false);
  const bumpTimer = useRef<number | undefined>(undefined);

  function handleAirpodTap() {
    const wasPlaying = isPlaying;
    toggleAirpod();
    if (wasPlaying) {
      setBumping(true);
      window.clearTimeout(bumpTimer.current);
      bumpTimer.current = window.setTimeout(() => setBumping(false), BUMP_DURATION_MS);
    }
  }

  return (
    <section aria-label="YaleMoji" className={styles.stage} data-landing-stage="" ref={stageRef}>
      <div className={styles.core} style={coreStyle(PLACEMENT.wordmark)}>
        <div className={styles.physicsCore} data-physics-body="" data-mass-grams={1000000}>
          <Image
            alt="YaleMoji"
            draggable={false}
            className={`${styles.wordmarkImage} ${styles.wordmarkLight}`}
            height={127}
            priority
            src="/assets/yalemoji.svg"
            width={465}
          />
          <Image
            alt="YaleMoji"
            draggable={false}
            className={`${styles.wordmarkImage} ${styles.wordmarkDark}`}
            height={127}
            priority
            src="/assets/yalemoji-dark.svg"
            width={465}
          />
        </div>
      </div>

      <DraggableSticker mass={8} placement={PLACEMENT.stickyNote}>
        <Image
          alt=""
          className={styles.stickyNote}
          height={321}
          priority
          sizes="20vw"
          src="/assets/landing/sticky-note.png"
          width={321}
        />
      </DraggableSticker>

      <DraggableSticker placement={PLACEMENT.avatarDarkHair}>
        <Image
          alt=""
          className={styles.avatarImage}
          height={1080}
          sizes="16vw"
          src="/assets/landing/avatar-dark-hair.png"
          width={1080}
        />
      </DraggableSticker>

      <DraggableSticker placement={PLACEMENT.avatarBoy}>
        <Image
          alt=""
          className={styles.avatarImage}
          height={1080}
          sizes="16vw"
          src="/assets/landing/avatar-boy.png"
          width={1080}
        />
      </DraggableSticker>

      <DraggableSticker placement={PLACEMENT.avatarStarEyes}>
        <Image
          alt=""
          className={styles.avatarImage}
          height={1080}
          sizes="18vw"
          src="/assets/landing/avatar-star-eyes.png"
          style={{ transform: "rotate(8.65deg)" }}
          width={1080}
        />
      </DraggableSticker>

      <DraggableSticker mass={15} placement={PLACEMENT.star}>
        <div className={styles.star}>
          <Image alt="" className={styles.starImage} height={116} src="/assets/landing/star.svg" width={116} />
        </div>
      </DraggableSticker>

      <DraggableSticker
        ariaLabel={isPlaying ? "Pause Boola Boola" : "Play Boola Boola"}
        onTap={handleAirpodTap}
        placement={PLACEMENT.soundCluster}
        mass={5}
        pressed={isPlaying}
      >
        <div className={styles.soundCluster}>
          <Image
            alt=""
            className={[styles.soundEar, bumping ? styles.bump : ""].filter(Boolean).join(" ")}
            height={54}
            src="/assets/landing/sound-icon.svg"
            width={33}
          />
          {SOUND_BARS.map(({ duration, delay, ...bar }, index) => (
            <span
              className={[styles.soundBar, isPlaying ? styles.playing : ""].filter(Boolean).join(" ")}
              key={index}
              style={{ ...bar, "--bar-duration": duration, "--bar-delay": delay } as CSSProperties}
            />
          ))}
        </div>
      </DraggableSticker>

      <MedalTug onTug={() => setTugCount((count) => count + 1)} placement={PLACEMENT.medal} />

      <div className={styles.core} style={coreStyle(PLACEMENT.cta)}>
        <div className={styles.physicsCore} data-physics-body="" data-mass-grams={1000000}>
          <Link className={styles.cta} draggable={false} href="/editor">
            CREATE NOW
          </Link>
        </div>
      </div>

      {tugCount > 0 && (
        <DraggableSticker mass={2} placement={PLACEMENT.tugText}>
          <p className={styles.tugText}>
            <strong>{tugCount}</strong> {tugCount === 1 ? "tug!" : "tugs!"}
          </p>
        </DraggableSticker>
      )}
    </section>
  );
}
