import { describe, expect, it } from "vitest";
import { createInitialSelections } from "@/config/avatar-options";
import {
  missingRequiredFeatures,
  sanitizeAvatarConfig,
  validateAvatarConfig
} from "@/lib/avatar-config";

function baseConfig() {
  return {
    selections: createInitialSelections(),
    accessories: {},
    facialHairId: null,
    skinPaletteId: "1",
    hairPaletteId: "1",
    backgroundId: "solid-1"
  };
}

describe("validateAvatarConfig", () => {
  it("accepts fractional color positions and rejects invalid positions", () => {
    const config = { ...baseConfig(), skinColorPosition: 0.51, hairColorPosition: 5.25 };
    expect(validateAvatarConfig(config)).toMatchObject(config);
    expect(sanitizeAvatarConfig(config, baseConfig())).toMatchObject(config);
    for (const value of [-1, 99, NaN, Infinity, "0.5", null]) {
      expect(validateAvatarConfig({ ...config, skinColorPosition: value })).toBeNull();
      expect(validateAvatarConfig({ ...config, hairColorPosition: value })).toBeNull();
    }
  });
  it("accepts a well-formed config", () => {
    expect(validateAvatarConfig(baseConfig())).not.toBeNull();
  });

  it("rejects a config with an unknown option id", () => {
    const config = baseConfig();
    config.selections.face = "face-does-not-exist";
    expect(validateAvatarConfig(config)).toBeNull();
  });

  it("rejects a config with an unknown palette id", () => {
    expect(
      validateAvatarConfig({ ...baseConfig(), skinPaletteId: "not-a-palette" })
    ).toBeNull();
  });

  it("rejects a config with an unknown background id", () => {
    expect(
      validateAvatarConfig({ ...baseConfig(), backgroundId: "not-a-background" })
    ).toBeNull();
  });

  it("rejects an accessory id assigned to the wrong accessory type", () => {
    const config = baseConfig();
    expect(
      validateAvatarConfig({
        ...config,
        accessories: { cheeks: "eyewear-1" }
      })
    ).toBeNull();
  });

  it("accepts a valid accessory selection", () => {
    const config = baseConfig();
    expect(
      validateAvatarConfig({
        ...config,
        accessories: { eyewear: "eyewear-1" }
      })
    ).not.toBeNull();
  });

  it("rejects non-object input", () => {
    expect(validateAvatarConfig(null)).toBeNull();
    expect(validateAvatarConfig("not an object")).toBeNull();
    expect(validateAvatarConfig(42)).toBeNull();
  });

  it("rejects a missing selections category", () => {
    const config = baseConfig() as { selections: Record<string, unknown> };
    delete config.selections.face;
    expect(validateAvatarConfig(config)).toBeNull();
  });
});

describe("missingRequiredFeatures", () => {
  it("requires eyes and a mouth", () => {
    const config = baseConfig();
    expect(missingRequiredFeatures(config)).toEqual(["eyes", "mouth"]);
    config.selections.eyes = "eyes-1";
    expect(missingRequiredFeatures(config)).toEqual(["mouth"]);
    config.selections.mouth = "mouth-1";
    expect(missingRequiredFeatures(config)).toEqual([]);
  });
});

describe("sanitizeAvatarConfig", () => {
  const defaults = () => validateAvatarConfig(baseConfig())!;

  it("keeps a valid config unchanged", () => {
    const config = { ...defaults(), accessories: { eyewear: "eyewear-1" } };
    config.selections.eyes = "eyes-2";
    expect(sanitizeAvatarConfig(config, defaults())).toEqual(config);
  });

  it("falls back per field instead of rejecting the whole config", () => {
    const config = {
      ...baseConfig(),
      selections: { ...createInitialSelections(), eyes: "eyes-2", hair: "hair-removed" },
      accessories: { eyewear: "eyewear-1", cheeks: "eyewear-1", unknown: "x" },
      skinPaletteId: "not-a-palette"
    };
    const result = sanitizeAvatarConfig(config, defaults())!;
    expect(result.selections.eyes).toBe("eyes-2");
    expect(result.selections.hair).toBeNull();
    expect(result.accessories).toEqual({ eyewear: "eyewear-1" });
    expect(result.skinPaletteId).toBe(defaults().skinPaletteId);
  });

  it("never leaves the face empty", () => {
    const config = baseConfig() as { selections: Record<string, unknown> };
    config.selections.face = null;
    expect(sanitizeAvatarConfig(config, defaults())!.selections.face).toBe(
      defaults().selections.face
    );
  });

  it("returns null for non-object input", () => {
    expect(sanitizeAvatarConfig(null, defaults())).toBeNull();
    expect(sanitizeAvatarConfig("x", defaults())).toBeNull();
    expect(sanitizeAvatarConfig([], defaults())).toBeNull();
  });
});
