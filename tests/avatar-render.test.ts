import { createCanvas, loadImage } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { avatarBackgroundSvg } from "@/config/avatar-backgrounds";
import { createInitialSelections } from "@/config/avatar-options";
import type { AvatarConfig } from "@/lib/avatar-config";
import { renderAvatarAssets } from "@/lib/avatar-render";

function baseConfig(): AvatarConfig {
  const selections = createInitialSelections();
  selections.hair = "hair-1";
  selections.eyes = "eyes-1";
  selections.brows = "brows-1";
  selections.mouth = "mouth-1";

  return {
    selections,
    accessories: {},
    facialHairId: null,
    skinPaletteId: "1",
    hairPaletteId: "1",
    backgroundId: "solid-1"
  };
}

async function cornerAlpha(png: Buffer) {
  const image = await loadImage(png);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, 1, 1).data[3];
}

describe("renderAvatarAssets", () => {
  it("renders a well-formed 512x512 subject SVG and a transparent PNG from a config", async () => {
    const { svg, png, backgroundSvg } = await renderAvatarAssets(baseConfig());

    expect(svg).toContain('width="512"');
    expect(svg).toContain('height="512"');
    expect(svg).toContain("<svg");
    expect(svg).not.toContain("var(--avatar-primary)");
    expect(svg).not.toContain("var(--avatar-secondary)");

    // PNG magic bytes
    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
    expect(png.byteLength).toBeGreaterThan(1000);

    // No background baked in: the corner is outside the subject and should
    // be fully transparent, not painted with the chosen background.
    expect(await cornerAlpha(png)).toBe(0);

    expect(backgroundSvg).toContain("<svg");
    expect(backgroundSvg).toContain('preserveAspectRatio="none"');
  });

  it("produces different subject output for different configs, independent of background", async () => {
    const first = await renderAvatarAssets(baseConfig());
    const second = await renderAvatarAssets({ ...baseConfig(), skinPaletteId: "6" });

    expect(first.svg).not.toEqual(second.svg);
    expect(first.png.equals(second.png)).toBe(false);

    const third = await renderAvatarAssets({
      ...baseConfig(),
      backgroundId: "gradient-tie-dye"
    });

    // Background choice alone must not affect the stored subject render.
    expect(first.svg).toEqual(third.svg);
    expect(first.png.equals(third.png)).toBe(true);
    expect(first.backgroundSvg).not.toEqual(third.backgroundSvg);
  });
});

describe("avatarBackgroundSvg", () => {
  it("renders every paint kind as a stretch-safe, non-square-friendly SVG", () => {
    const kinds: Array<Parameters<typeof avatarBackgroundSvg>[0]> = [
      { kind: "solid", color: "#FFFFFF" },
      { kind: "linear", angle: 180, stops: [{ color: "#FFF", at: 0 }, { color: "#000", at: 100 }] },
      {
        kind: "blobs",
        base: { angle: 180, stops: [{ color: "#FFF", at: 0 }, { color: "#000", at: 100 }] },
        blobs: [{ x: 50, y: 50, color: "#FF00FF", radius: 40 }]
      },
      { kind: "checks", first: "#FFF", second: "#000" },
      { kind: "dots", dot: "#FF00FF", background: "#FFF", radius: 28 }
    ];

    for (const paint of kinds) {
      const markup = avatarBackgroundSvg(paint);
      expect(markup).toContain('viewBox="0 0 100 100"');
      expect(markup).toContain('preserveAspectRatio="none"');
    }
  });
});
