import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createPreviewConfig, nextPreviewConfig, previewLayerSources } from "@/lib/avatar-preview";
import { validateAvatarConfig } from "@/lib/avatar-config";
import { findReferringApp, yaleApps } from "@/config/yale-apps";

describe("avatar preview", () => {
  it("changes at least three choices per step while keeping the avatar valid", () => {
    let config = createPreviewConfig();
    for (let tick = 0; tick < 300; tick++) {
      const next = nextPreviewConfig(config, tick, () => (tick % 10) / 10);
      const choices = (value: typeof config) => ({
        ...value.selections,
        ...Object.fromEntries(["eyewear", "cheeks", "hairClips", "earrings", "crest"].map((key) => [key, value.accessories[key as keyof typeof value.accessories]])),
        skin: value.skinPaletteId,
        hairColor: value.hairPaletteId,
        backgroundColor: value.backgroundId,
        facialHair: value.facialHairId
      });
      const previous = choices(config);
      const current = choices(next);
      expect(Object.keys(previous).filter((key) => previous[key as keyof typeof previous] !== current[key as keyof typeof current]).length).toBeGreaterThanOrEqual(3);
      expect(Object.keys(next.accessories).length).toBeLessThanOrEqual(1);
      expect(next.selections.mouth).toBe(config.selections.mouth);
      expect(next.selections.brows).toBe(config.selections.brows);
      expect(validateAvatarConfig(next)).not.toBeNull();
      config = next;
    }
  });

  it("keeps facial hair and colorful hair to about 2% of frames, and accessories to about 20%", () => {
    let seed = 12345;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    let config = createPreviewConfig();
    let facialHair = 0;
    let colorfulHair = 0;
    let accessories = 0;
    const frames = 10000;
    for (let tick = 0; tick < frames; tick++) {
      config = nextPreviewConfig(config, tick, random);
      if (config.facialHairId) facialHair++;
      if (["11", "12", "13"].includes(config.hairPaletteId)) colorfulHair++;
      const accessoryCount = Object.keys(config.accessories).length;
      expect(accessoryCount).toBeLessThanOrEqual(1);
      expect(config.accessories.hairClips).not.toBe("hair-clips-4");
      if (accessoryCount) accessories++;
    }
    expect(facialHair / frames).toBeGreaterThan(0.015);
    expect(facialHair / frames).toBeLessThan(0.025);
    expect(colorfulHair / frames).toBeGreaterThan(0.015);
    expect(colorfulHair / frames).toBeLessThan(0.025);
    expect(accessories / frames).toBeGreaterThan(0.18);
    expect(accessories / frames).toBeLessThan(0.22);
  });

  it("removes existing stacks of accessories and facial hair on an ordinary frame", () => {
    const config = createPreviewConfig();
    config.accessories = { eyewear: "eyewear-1", cheeks: "cheeks-1", earrings: "earrings-1" };
    config.facialHairId = "facial-hair-1";
    config.hairPaletteId = "11";
    const next = nextPreviewConfig(config, 0, () => 0.5);
    expect(next.accessories).toEqual({});
    expect(next.facialHairId).toBeNull();
    expect(["11", "12", "13"]).not.toContain(next.hairPaletteId);
  });

  it("only preloads layers and app icons that exist", () => {
    expect(previewLayerSources).not.toContain("/yalemoji/Accessories/hair4.svg");
    for (const source of [...previewLayerSources, ...yaleApps.map((app) => app.image)]) {
      expect(existsSync(resolve("public", source.slice(1))), source).toBe(true);
    }
  });
});

describe("referring apps", () => {
  it.each([
    ["coursetable", "coursetable"], ["ylabs", "ylabs"], ["y/labs", "ylabs"],
    ["yaleclubs", "yaleclubs"], ["yclubs", "yaleclubs"], ["yaleims", "yaleims"],
    ["ymeets", "ymeets"], ["yalesmeals", "yalemeals"], ["yalemeals", "yalemeals"],
    ["majoraudit", "majoraudit"], [" Yalies ", "yalies"]
  ])("resolves %s", (ref, id) => {
    expect(findReferringApp(ref)?.id).toBe(id);
  });

  it("handles missing, unknown, and unsafe refs as a direct visit", () => {
    for (const ref of [null, undefined, "", "unknown", "<script>alert(1)</script>"]) {
      expect(findReferringApp(ref)).toBeNull();
    }
  });
});
