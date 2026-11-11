"use client";

import type { CSSProperties } from "react";
import { type AvatarPalette } from "@/config/avatar-palettes";
import { interpolatePalette } from "@/lib/avatar-colors";
import styles from "./palette-slider.module.css";

export function PaletteSlider({ label, options, value, onChange }: {
  label: string;
  options: readonly AvatarPalette[];
  value: number;
  onChange: (value: number) => void;
}) {
  const palette = interpolatePalette(options, value);
  return (
    <div aria-label={`${label} color`} className={styles.picker} role="group">
      <input
        aria-label={`${label === "Face" ? "Skin" : label} color`}
        aria-valuetext={palette.primary}
        className={styles.slider}
        type="range" min={0} max={options.length - 1} step={0.01} value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{
          "--selected-color": palette.primary,
          "--color-gradient": `linear-gradient(to right, ${options.map((option) => option.primary).join(", ")})`
        } as CSSProperties}
      />

    </div>
  );
}
