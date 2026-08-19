import type { CSSProperties } from "react";
import { categoryLabels, type AvatarCategory, type AvatarOption } from "@/config/avatar-options";
import type { AvatarPalette } from "@/config/avatar-palettes";
import { AvatarLayer } from "./avatar-layer";
import styles from "./avatar-option-grid.module.css";

type AvatarOptionGridProps = {
  category: AvatarCategory;
  onSelect: (option: AvatarOption) => void;
  options: readonly AvatarOption[];
  palette?: AvatarPalette;
  selectedId: string | null;
  skinPalette?: AvatarPalette;
};

export function AvatarOptionGrid({
  category,
  onSelect,
  options,
  palette,
  selectedId,
  skinPalette
}: AvatarOptionGridProps) {
  if (options.length === 0) {
    return (
      <p className={styles.empty} role="status">
        Add SVGs to <code>public/yalemoji/{category}/</code>, then list them in{" "}
        <code>config/avatar-options.ts</code>.
      </p>
    );
  }

  return (
    <div aria-label={`${categoryLabels[category]} options`} className={styles.grid}>
      {options.map((option) => (
        <button
          aria-label={`Select ${option.label}`}
          aria-pressed={selectedId === option.id}
          className={styles.option}
          key={option.id}
          onClick={() => onSelect(option)}
          type="button"
        >
          <span
            className={styles.preview}
            style={(category === "hair" ? skinPalette : palette) ? {
              "--avatar-primary": (category === "hair" ? skinPalette : palette)?.primary,
              "--avatar-secondary": (category === "hair" ? skinPalette : palette)?.secondary
            } as CSSProperties : undefined}
          >
            {category === "hair" ? (
              <>
                {option.backSrc ? (
                  <span
                    className={`${styles.previewLayer} ${styles.hairBack}`}
                    data-preview-layer="hair-back"
                    style={palette ? {
                      "--avatar-primary": palette.primary,
                      "--avatar-secondary": palette.secondary
                    } as CSSProperties : undefined}
                  >
                    <AvatarLayer src={option.backSrc} />
                  </span>
                ) : null}
                <span
                  className={`${styles.previewLayer} ${styles.hairFront}`}
                  data-preview-layer="hair-front"
                  style={palette ? {
                    "--avatar-primary": palette.primary,
                    "--avatar-secondary": palette.secondary
                  } as CSSProperties : undefined}
                >
                  <AvatarLayer
                    fit={option.src.startsWith("/yalemoji/FacialHair/")}
                    src={option.frontSrc ?? option.src}
                  />
                </span>
              </>
            ) : (
              <AvatarLayer fit={category !== "face"} src={option.src} />
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
