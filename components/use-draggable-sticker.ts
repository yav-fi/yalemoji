"use client";

import { useEffect, useRef } from "react";

const FRICTION = 0.94;
const MIN_VELOCITY = 0.02;
const FRAME_MS = 16;
const TAP_THRESHOLD = 8;

export function useDraggableSticker<T extends HTMLElement>(options?: { onTap?: () => void }) {
  const ref = useRef<T | null>(null);
  const onTapRef = useRef(options?.onTap);
  onTapRef.current = options?.onTap;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const state = {
      x: 0,
      y: 0,
      pointerId: null as number | null,
      downX: 0,
      downY: 0,
      lastX: 0,
      lastY: 0,
      lastTime: 0,
      vx: 0,
      vy: 0,
      momentumFrame: 0
    };

    function applyTransform() {
      el!.style.transform = `translate3d(${state.x}px, ${state.y}px, 0)`;
    }

    function stopMomentum() {
      if (state.momentumFrame) {
        cancelAnimationFrame(state.momentumFrame);
        state.momentumFrame = 0;
      }
    }

    function onPointerDown(event: PointerEvent) {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      stopMomentum();
      state.pointerId = event.pointerId;
      state.downX = event.clientX;
      state.downY = event.clientY;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      state.lastTime = performance.now();
      state.vx = 0;
      state.vy = 0;
      el!.setPointerCapture(event.pointerId);
      el!.style.transition = "none";
      el!.style.cursor = "grabbing";
    }

    function onPointerMove(event: PointerEvent) {
      if (event.pointerId !== state.pointerId) return;
      const now = performance.now();
      const dt = Math.max(now - state.lastTime, 1);
      const dx = event.clientX - state.lastX;
      const dy = event.clientY - state.lastY;
      state.x += dx;
      state.y += dy;
      state.vx = dx / dt;
      state.vy = dy / dt;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      state.lastTime = now;
      applyTransform();
    }

    function onPointerUp(event: PointerEvent) {
      if (event.pointerId !== state.pointerId) return;
      state.pointerId = null;
      el!.style.cursor = "grab";
      try {
        el!.releasePointerCapture(event.pointerId);
      } catch {
        // pointer capture may already be released
      }

      const moved = Math.hypot(event.clientX - state.downX, event.clientY - state.downY);
      if (moved < TAP_THRESHOLD) onTapRef.current?.();

      if (reducedMotion) return;

      function step() {
        state.vx *= FRICTION;
        state.vy *= FRICTION;
        if (Math.hypot(state.vx, state.vy) < MIN_VELOCITY) {
          state.momentumFrame = 0;
          return;
        }
        state.x += state.vx * FRAME_MS;
        state.y += state.vy * FRAME_MS;
        applyTransform();
        state.momentumFrame = requestAnimationFrame(step);
      }

      state.momentumFrame = requestAnimationFrame(step);
    }

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);

    return () => {
      stopMomentum();
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  return ref;
}
