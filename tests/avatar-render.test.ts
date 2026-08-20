import { describe, expect, it } from "vitest";
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

describe("renderAvatarAssets", () => {
  it("renders a well-formed 512x512 subject SVG and PNG from a config", async () => {
    const { svg, png } = await renderAvatarAssets(baseConfig());

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
  });

  it("produces different output for different configs", async () => {
    const first = await renderAvatarAssets(baseConfig());
    const second = await renderAvatarAssets({
      ...baseConfig(),
      skinPaletteId: "6",
      backgroundId: "gradient-tie-dye"
    });

    expect(first.svg).not.toEqual(second.svg);
    expect(first.png.equals(second.png)).toBe(false);
  });
});
