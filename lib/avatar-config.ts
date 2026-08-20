import {
  accessoryTypes,
  avatarCategories,
  avatarOptions,
  facialHairOptions,
  findAccessoryOption,
  type AccessorySelections,
  type AvatarCategory,
  type AvatarSelections
} from "@/config/avatar-options";
import { hairPalettes, skinPalettes } from "@/config/avatar-palettes";
import { avatarBackgroundOptions } from "@/config/avatar-backgrounds";

export type AvatarConfig = {
  selections: AvatarSelections;
  accessories: AccessorySelections;
  facialHairId: string | null;
  skinPaletteId: string;
  hairPaletteId: string;
  backgroundId: string;
};

const skinPaletteIds = new Set<string>(skinPalettes.map((palette) => palette.id));
const hairPaletteIds = new Set<string>(hairPalettes.map((palette) => palette.id));
const backgroundIds = new Set(avatarBackgroundOptions.map((option) => option.id));
const facialHairIds = new Set(facialHairOptions.map((option) => option.id));
const optionIdsByCategory: Record<AvatarCategory, Set<string>> = Object.fromEntries(
  avatarCategories.map((category) => [
    category,
    new Set(avatarOptions[category].map((option) => option.id))
  ])
) as Record<AvatarCategory, Set<string>>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validSelections(value: unknown): AvatarSelections | null {
  if (!isPlainObject(value)) return null;
  const result = {} as AvatarSelections;

  for (const category of avatarCategories) {
    const raw = value[category];
    if (raw === null) {
      result[category] = null;
      continue;
    }
    if (typeof raw !== "string" || !optionIdsByCategory[category].has(raw)) {
      return null;
    }
    result[category] = raw;
  }

  return result;
}

function validAccessories(value: unknown): AccessorySelections | null {
  if (!isPlainObject(value)) return null;
  const result: AccessorySelections = {};

  for (const [key, raw] of Object.entries(value)) {
    if (!(accessoryTypes as readonly string[]).includes(key)) return null;
    if (typeof raw !== "string") return null;
    const type = key as (typeof accessoryTypes)[number];
    if (!findAccessoryOption(type, raw)) return null;
    result[type] = raw;
  }

  return result;
}

export function validateAvatarConfig(input: unknown): AvatarConfig | null {
  if (!isPlainObject(input)) return null;

  const selections = validSelections(input.selections);
  if (!selections) return null;

  const accessories = validAccessories(input.accessories ?? {});
  if (!accessories) return null;

  const facialHairId = input.facialHairId;
  if (facialHairId !== null && !(typeof facialHairId === "string" && facialHairIds.has(facialHairId))) {
    return null;
  }

  const { skinPaletteId, hairPaletteId, backgroundId } = input;
  if (typeof skinPaletteId !== "string" || !skinPaletteIds.has(skinPaletteId)) return null;
  if (typeof hairPaletteId !== "string" || !hairPaletteIds.has(hairPaletteId)) return null;
  if (typeof backgroundId !== "string" || !backgroundIds.has(backgroundId)) return null;

  return {
    selections,
    accessories,
    facialHairId,
    skinPaletteId,
    hairPaletteId,
    backgroundId
  };
}
