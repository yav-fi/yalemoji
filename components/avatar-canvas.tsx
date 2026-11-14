import type { CSSProperties } from "react";
import {
  facialHairOptions,
  findAccessoryOption,
  findAvatarOption,
  fixedNoseSrc,
  type AccessorySelections,
  type AvatarSelections
} from "@/config/avatar-options";
import type { AvatarPalette } from "@/config/avatar-palettes";
import { AvatarLayer } from "./avatar-layer";
import styles from "./avatar-canvas.module.css";

export type AvatarLayerDescriptor = {
  key: string;
  palette?: "hair" | "skin";
  occludedBySrc?: string;
  offsetY?: number;
  slot:
    | "hair-back"
    | "jewelry-back"
    | "face"
    | "cheeks"
    | "mouth"
    | "facial-hair"
    | "nose"
    | "crest"
    | "earrings"
    | "hair-front"
    | "brows"
    | "eyes"
    | "eyewear"
    | "hair-clips";
  src: string;
};

type AvatarCanvasProps = {
  accessories: AccessorySelections;
  facialHairId: string | null;
  hairPalette: AvatarPalette;
  selections: AvatarSelections;
  skinPalette: AvatarPalette;
};

export function createAvatarLayers(
  selections: AvatarSelections,
  accessories: AccessorySelections,
  facialHairId: string | null
): AvatarLayerDescriptor[] {
  const hair = findAvatarOption("hair", selections.hair);
  const face = findAvatarOption("face", selections.face);
  const mouth = findAvatarOption("mouth", selections.mouth);
  const brows = findAvatarOption("brows", selections.brows);
  const eyes = findAvatarOption("eyes", selections.eyes);
  const facialHair = facialHairOptions.find((option) => option.id === facialHairId);
  const cheeks = findAccessoryOption("cheeks", accessories.cheeks);
  const crest = findAccessoryOption("crest", accessories.crest);
  const earrings = findAccessoryOption("earrings", accessories.earrings);
  const eyewear = findAccessoryOption("eyewear", accessories.eyewear);
  const hairClips = findAccessoryOption("hairClips", accessories.hairClips);
  const layers: AvatarLayerDescriptor[] = [];

  const add = (
    slot: AvatarLayerDescriptor["slot"],
    src: string | undefined,
    palette?: AvatarLayerDescriptor["palette"]
  ) => {
    if (src) layers.push({ key: `${slot}-${src}`, slot, src, palette });
  };

  add("hair-back", hair?.backSrc, "hair");
  add("face", face?.src, "skin");
  add("cheeks", cheeks?.src);
  add("mouth", mouth?.src);
  add("facial-hair", facialHair?.src, "hair");
  add("nose", fixedNoseSrc, "skin");
  add("crest", crest?.src);
  if (!earrings?.behindFace) add("earrings", earrings?.src);
  add("hair-front", hair?.frontSrc, "hair");
  // Long hairstyles can include their lower outline in the front asset.
  // Draw necklaces over that outline, masking out the face to keep them behind it.
  if (earrings?.behindFace) {
    layers.push({
      key: `jewelry-back-${earrings.src}`,
      slot: "jewelry-back",
      src: earrings.src,
      occludedBySrc: face?.src,
      offsetY: earrings.id === "cross" && (face?.id === "face-2" || face?.id === "face-4") ? 7 : 0
    });
  }
  add("brows", brows?.src);
  add("eyes", eyes?.src);
  add("eyewear", eyewear?.src);
  add("hair-clips", hairClips?.src);

  return layers;
}

export function AvatarCanvas({
  accessories,
  facialHairId,
  hairPalette,
  selections,
  skinPalette
}: AvatarCanvasProps) {
  const layers = createAvatarLayers(selections, accessories, facialHairId);
  const paletteStyle = {
    "--avatar-primary": skinPalette.primary,
    "--avatar-secondary": skinPalette.secondary,
    "--avatar-hair-primary": hairPalette.primary,
    "--avatar-hair-secondary": hairPalette.secondary
  } as CSSProperties;

  return (
    <div className={styles.canvas} data-active="true" style={paletteStyle}>
      {layers.map((layer) => (
        <div
          className={styles.layer}
          data-avatar-layer={layer.slot}
          data-category={
            ["face", "eyes", "brows", "mouth"].includes(layer.slot)
              ? layer.slot
              : layer.slot.includes("hair")
                ? "hair"
                : "accessories"
          }
          data-palette={layer.palette}
          key={layer.key}
        >
          <AvatarLayer src={layer.src} occludedBySrc={layer.occludedBySrc} offsetY={layer.offsetY} />
        </div>
      ))}
    </div>
  );
}
