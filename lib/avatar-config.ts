import {
  accessoryTypes,
  avatarCategories,
  avatarOptions,
  createInitialSelections,
  facialHairOptions,
  findAccessoryOption,
  type AccessorySelections,
  type AvatarCategory,
  type AvatarSelections
} from "@/config/avatar-options";
import { hairPalettes, skinPalettes } from "@/config/avatar-palettes";
import { avatarBackgroundOptions, defaultAvatarBackground } from "@/config/avatar-backgrounds";

export type AvatarConfig = {
  selections: AvatarSelections;
  accessories: AccessorySelections;
  facialHairId: string | null;
  skinPaletteId: string;
  hairPaletteId: string;
  backgroundId: string;
};

export const DEFAULT_SKIN_PALETTE = skinPalettes[2];
export const DEFAULT_HAIR_PALETTE = hairPalettes[0];

export function defaultSelections(): AvatarSelections {
  const selections = createInitialSelections();
  selections.hair = null;
  selections.eyes = null;
  selections.brows = null;
  selections.mouth = null;
  return selections;
}

export const defaultConfig: AvatarConfig = {
  selections: defaultSelections(),
  accessories: {},
  facialHairId: null,
  skinPaletteId: DEFAULT_SKIN_PALETTE.id,
  hairPaletteId: DEFAULT_HAIR_PALETTE.id,
  backgroundId: defaultAvatarBackground.id
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

// Every saved or downloaded YaleMoji must include these. Drafts may be incomplete.
export const requiredFeatures = ["eyes", "mouth"] as const satisfies readonly AvatarCategory[];
export type RequiredFeature = (typeof requiredFeatures)[number];

export function missingRequiredFeatures(config: Pick<AvatarConfig, "selections">): RequiredFeature[] {
  return requiredFeatures.filter((category) => !config.selections[category]);
}

// Lenient counterpart to validateAvatarConfig for restoring local drafts: each
// invalid field falls back to its value in `defaults` instead of rejecting the
// whole config, so a removed option doesn't wipe out the rest of a draft.
export function sanitizeAvatarConfig(input: unknown, defaults: AvatarConfig): AvatarConfig | null {
  if (!isPlainObject(input)) return null;

  const rawSelections = isPlainObject(input.selections) ? input.selections : {};
  const selections = {} as AvatarSelections;
  for (const category of avatarCategories) {
    const raw = rawSelections[category];
    if (raw === null && category !== "face") selections[category] = null;
    else if (typeof raw === "string" && optionIdsByCategory[category].has(raw)) selections[category] = raw;
    else selections[category] = defaults.selections[category];
  }

  const rawAccessories = isPlainObject(input.accessories) ? input.accessories : {};
  const accessories: AccessorySelections = {};
  for (const type of accessoryTypes) {
    const raw = rawAccessories[type];
    if (typeof raw === "string" && findAccessoryOption(type, raw)) accessories[type] = raw;
  }

  const pick = (raw: unknown, ids: Set<string>, fallback: string) =>
    typeof raw === "string" && ids.has(raw) ? raw : fallback;

  return {
    selections,
    accessories,
    facialHairId:
      typeof input.facialHairId === "string" && facialHairIds.has(input.facialHairId)
        ? input.facialHairId
        : null,
    skinPaletteId: pick(input.skinPaletteId, skinPaletteIds, defaults.skinPaletteId),
    hairPaletteId: pick(input.hairPaletteId, hairPaletteIds, defaults.hairPaletteId),
    backgroundId: pick(input.backgroundId, backgroundIds, defaults.backgroundId)
  };
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
