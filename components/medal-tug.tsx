"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import styles from "./medal-tug.module.css";

type Placement = { x: string; y: string; w: string; h: string; delay: string };

export function MedalTug({ onTug, placement }: { onTug: () => void; placement: Placement }) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const onTugRef = useRef(onTug);
  onTugRef.current = onTug;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tug = () => onTugRef.current();
    el.addEventListener("physics-tug", tug);
    return () => el.removeEventListener("physics-tug", tug);
  }, []);

  const slotStyle = {
    "--x": placement.x, "--y": placement.y,
    "--w": placement.w, "--h": placement.h, "--delay": placement.delay
  } as CSSProperties;

  return (
    <div aria-hidden="true" className={styles.slot} style={slotStyle}>
      <button className={styles.medal} ref={ref} type="button" tabIndex={-1}
        data-physics-body="" data-mass-grams={120} data-draggable="true" data-tether="medal">
        <Image alt="" className={styles.image} draggable={false} fill priority sizes="(max-width: 48rem) 220px, 472px" src="/assets/landing/medal.png" />
      </button>
    </div>
  );
}
