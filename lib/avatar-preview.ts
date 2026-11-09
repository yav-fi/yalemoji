import { accessoryGroups, avatarOptions, createInitialSelections, facialHairOptions } from "@/config/avatar-options";
import { hairPalettes, skinPalettes } from "@/config/avatar-palettes";
import { avatarBackgroundOptions } from "@/config/avatar-backgrounds";
import type { AvatarConfig } from "./avatar-config";

const normalMouthId = avatarOptions.mouth[0].id;
const normalBrowsId = avatarOptions.brows[5].id;
const previewAccessoryGroups = accessoryGroups.map((group) => ({
  ...group,
  options: group.options.filter((option) => option.id !== "hair-clips-4")
}));

export function createPreviewConfig(): AvatarConfig {
  return {
    selections: {
      ...createInitialSelections(),
      eyes: avatarOptions.eyes[0].id,
      brows: normalBrowsId,
      mouth: normalMouthId,
      hair: avatarOptions.hair[4].id
    },
    accessories: {},
    facialHairId: null,
    skinPaletteId: skinPalettes[2].id,
    hairPaletteId: hairPalettes[1].id,
    backgroundId: avatarBackgroundOptions[0].id
  };
}

function differentOption<T>(options: readonly T[], current: T, random: () => number): T {
  const alternatives = options.filter((option) => option !== current);
  return alternatives[Math.min(alternatives.length - 1, Math.floor(random() * alternatives.length))] ?? current;
}

const naturalHairColors = hairPalettes.slice(0, 10).map((palette) => palette.id);
const colorfulHairColors = hairPalettes.slice(10).map((palette) => palette.id);

// Change three choices each tick, while keeping rare traits rare per frame.
export function nextPreviewConfig(config: AvatarConfig, tick: number, random = Math.random): AvatarConfig {
  const features = ["hair", "eyes", "face", "skinPaletteId"] as const;
  const next: AvatarConfig = {
    ...config,
    selections: { ...config.selections, mouth: normalMouthId, brows: normalBrowsId },
    accessories: {},
    facialHairId: null,
    hairPaletteId: differentOption(
      random() < 0.02 ? colorfulHairColors : naturalHairColors,
      config.hairPaletteId,
      random
    )
  };

  for (let offset = 0; offset < 2; offset++) {
    const feature = features[(tick * 2 + offset) % features.length];
    if (feature === "skinPaletteId") {
      next[feature] = differentOption(skinPalettes.map((option) => option.id), config[feature], random);
    } else {
      next.selections[feature] = differentOption(avatarOptions[feature].map((option) => option.id), config.selections[feature], random);
    }
  }

  // Most frames have no accessories; selected frames have exactly one.
  if (random() < 0.2) {
    const group = previewAccessoryGroups[Math.floor(random() * previewAccessoryGroups.length)];
    next.accessories[group.id] = group.options[Math.floor(random() * group.options.length)].id;
  }

  // Resample presence every frame, rather than leaving facial hair selected.
  if (random() < 0.02) {
    next.facialHairId = facialHairOptions[Math.floor(random() * facialHairOptions.length)].id;
  }

  return next;
}

export const previewLayerSources = Array.from(new Set([
  ...Object.values(avatarOptions).flatMap((options) => options.flatMap((option) => [option.src, option.frontSrc, option.backSrc])),
  ...facialHairOptions.map((option) => option.src)
].filter((src): src is `/yalemoji/${string}.svg` => Boolean(src) && src !== "/yalemoji/Accessories/hair4.svg")));
