"use client";

import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { useDraggableSticker } from "./use-draggable-sticker";
import styles from "./draggable-sticker.module.css";

type StickerPlacement = {
  x: string;
  y: string;
  w: string;
  h: string;
  delay: string;
};

export function DraggableSticker({
  placement,
  className,
  handleClassName,
  children,
  onTap,
  ariaLabel,
  pressed,
  mass = 30
}: {
  placement: StickerPlacement;
  className?: string;
  handleClassName?: string;
  children: ReactNode;
  onTap?: () => void;
  ariaLabel?: string;
  pressed?: boolean;
  mass?: number;
}) {
  const dragRef = useDraggableSticker<HTMLDivElement>({ onTap });
  const interactive = Boolean(onTap);

  const slotStyle = {
    "--x": placement.x,
    "--y": placement.y,
    "--w": placement.w,
    "--h": placement.h,
    "--delay": placement.delay
  } as CSSProperties;

  function onKeyDown(event: KeyboardEvent) {
    if (!onTap) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onTap();
    }
  }

  return (
    <div
      aria-hidden={interactive ? undefined : "true"}
      className={[styles.slot, className].filter(Boolean).join(" ")}
      style={slotStyle}
    >
      <div
        data-physics-body=""
        data-mass-grams={mass}
        data-draggable="true"
        aria-label={interactive ? ariaLabel : undefined}
        aria-pressed={interactive ? pressed : undefined}
        className={[styles.handle, handleClassName].filter(Boolean).join(" ")}
        onKeyDown={interactive ? onKeyDown : undefined}
        ref={dragRef}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
      >
        {children}
      </div>
    </div>
  );
}
