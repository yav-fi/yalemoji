"use client";

import { useEffect, useRef } from "react";

// Pointer motion belongs to the shared board simulation; taps stay local.
export function useDraggableSticker<T extends HTMLElement>(options?: { onTap?: () => void }) {
  const ref = useRef<T | null>(null);
  const onTapRef = useRef(options?.onTap);
  onTapRef.current = options?.onTap;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onTap = () => onTapRef.current?.();
    el.addEventListener("physics-tap", onTap);
    return () => el.removeEventListener("physics-tap", onTap);
  }, []);
  return ref;
}
