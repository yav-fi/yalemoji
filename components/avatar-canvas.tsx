import Image from "next/image";
import type { CSSProperties } from "react";
import type { AvatarBackgroundOption } from "@/config/avatar-backgrounds";
import { findAvatarOption, fixedNoseSrc, layerOrder, type AvatarSelections } from "@/config/avatar-options";
import type { AvatarPalette } from "@/config/avatar-palettes";
import { AvatarLayer } from "./avatar-layer";
import styles from "./avatar-canvas.module.css";

type AvatarCanvasProps = {
  active: boolean;
  backgroundOption: AvatarBackgroundOption | null;
  selections: AvatarSelections;
  skinPalette: AvatarPalette;
  hairPalette: AvatarPalette | null;
  fallback?: boolean;
};

export function AvatarCanvas({
  active,
  backgroundOption,
  fallback = false,
  hairPalette,
  selections,
  skinPalette
}: AvatarCanvasProps) {
  const selectedHair = active ? findAvatarOption("hair", selections.hair) : null;
  const selectedLayers = layerOrder.flatMap((category) => {
    if (category === "hair" || (!active && category !== "face")) return [];
    const option = findAvatarOption(category, selections[category]);
    return option ? [{ category, option }] : [];
  });

  const paletteStyle = {
    "--avatar-primary": skinPalette.primary,
    "--avatar-secondary": skinPalette.secondary,
    "--avatar-hair-primary": hairPalette?.primary ?? skinPalette.primary,
    "--avatar-hair-secondary": hairPalette?.secondary ?? skinPalette.secondary
  } as CSSProperties;

  return (
    <div className={styles.canvas} data-active={active} style={paletteStyle}>
      {backgroundOption ? (
        <div
          className={styles.background}
          data-avatar-layer="background"
          data-background-option={backgroundOption.id}
          style={{ background: backgroundOption.background }}
        />
      ) : null}
      {fallback && !selections.face ? (
        <Image alt="" className={styles.fallback} height={209} src="/assets/editor-face.png" width={201} />
      ) : null}
      {selectedHair?.backSrc ? (
        <div className={`${styles.layer} ${styles.hairBack}`} data-avatar-layer="hair-back">
          <AvatarLayer src={selectedHair.backSrc} />
        </div>
      ) : null}
      {selectedLayers.map(({ category, option }) => (
        <div className={styles.layer} data-category={category} key={`${category}-${option.id}`}>
          <AvatarLayer src={option.src} />
        </div>
      ))}
      {active ? (
        <div className={`${styles.layer} ${styles.nose}`} data-avatar-layer="nose">
          <AvatarLayer src={fixedNoseSrc} />
        </div>
      ) : null}
      {selectedHair?.frontSrc ? (
        <div className={`${styles.layer} ${styles.hairFront}`} data-avatar-layer="hair-front">
          <AvatarLayer src={selectedHair.frontSrc} />
        </div>
      ) : null}
    </div>
  );
}
