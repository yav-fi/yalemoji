"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import styles from "./medal-tug.module.css";

const MAX_PULL = 56;
const TUG_THRESHOLD = 22;
const SPRING_BACK_MS = 320;

type Placement = { x: string; y: string; w: string; h: string; delay: string };

export function MedalTug({ onTug, placement }: { onTug: () => void; placement: Placement }) {
  const ref = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const state = {
      pointerId: null as number | null,
      startX: 0,
      startY: 0,
      towardX: 0,
      towardY: 1
    };

    function setOffset(x: number, y: number) {
      el!.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    function onPointerDown(event: PointerEvent) {
      if (event.button !== 0 && event.pointerType === "mouse") return;

      const stage = el!.closest<HTMLElement>("[data-landing-stage]");
      const elRect = el!.getBoundingClientRect();
      const stageRect = (stage ?? document.body).getBoundingClientRect();
      const elCenterX = elRect.left + elRect.width / 2;
      const elCenterY = elRect.top + elRect.height / 2;
      const stageCenterX = stageRect.left + stageRect.width / 2;
      const stageCenterY = stageRect.top + stageRect.height / 2;
      const dirX = stageCenterX - elCenterX;
      const dirY = stageCenterY - elCenterY;
      const dirLength = Math.hypot(dirX, dirY) || 1;

      state.pointerId = event.pointerId;
      state.startX = event.clientX;
      state.startY = event.clientY;
      state.towardX = dirX / dirLength;
      state.towardY = dirY / dirLength;

      el!.setPointerCapture(event.pointerId);
      el!.style.transition = "none";
      el!.style.cursor = "grabbing";
    }

    function onPointerMove(event: PointerEvent) {
      if (event.pointerId !== state.pointerId) return;
      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      const length = Math.hypot(dx, dy);
      const clampedLength = Math.min(length, MAX_PULL);
      const scale = length === 0 ? 0 : clampedLength / length;
      setOffset(dx * scale, dy * scale);
    }

    function onPointerUp(event: PointerEvent) {
      if (event.pointerId !== state.pointerId) return;
      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      const pulledTowardCenter = dx * state.towardX + dy * state.towardY;

      state.pointerId = null;
      el!.style.cursor = "grab";
      try {
        el!.releasePointerCapture(event.pointerId);
      } catch {
        // pointer capture may already be released
      }

      el!.style.transition = `transform ${SPRING_BACK_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
      setOffset(0, 0);

      if (pulledTowardCenter > TUG_THRESHOLD) onTug();
    }

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
    };
  }, [onTug]);

  const slotStyle = {
    "--x": placement.x,
    "--y": placement.y,
    "--w": placement.w,
    "--h": placement.h,
    "--delay": placement.delay
  } as CSSProperties;

  return (
    <div aria-hidden="true" className={styles.slot} style={slotStyle}>
      <button className={styles.medal} ref={ref} type="button" tabIndex={-1}>
        <Image alt="" className={styles.image} draggable={false} fill priority sizes="(max-width: 48rem) 220px, 472px" src="/assets/landing/medal.png" />
      </button>
    </div>
  );
}
