import { describe, expect, it } from "vitest";
import { createInitialSelections } from "@/config/avatar-options";
import { validateAvatarConfig } from "@/lib/avatar-config";

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
