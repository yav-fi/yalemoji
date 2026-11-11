import { describe, expect, it } from "vitest";
import { DEFAULT_SKIN_PALETTE, defaultConfig } from "@/lib/avatar-config";
import {
  defaultDesignName,
  displayDesigns,
  formatShortAge,
  parseDesignVersion,
  validateDesignName,
  type RawDesign
} from "@/lib/designs";

describe("defaultDesignName", () => {
  it("numbers new designs from the existing count", () => {
    expect(defaultDesignName(0)).toBe("Untitled 1");
    expect(defaultDesignName(2)).toBe("Untitled 3");
  });

  it("falls back to a bare name when the count is unknown", () => {
    expect(defaultDesignName(null)).toBe("Untitled");
  });
});

describe("validateDesignName", () => {
  it("trims and collapses whitespace", () => {
    expect(validateDesignName("  Beach   day ")).toBe("Beach day");
  });

  it.each(["", "   ", 42, null, "a\u0007b"])("rejects %j", (input) => {
    expect(validateDesignName(input)).toBeNull();
  });

  it("accepts 60 characters and rejects 61", () => {
    expect(validateDesignName("x".repeat(60))).toBe("x".repeat(60));
    expect(validateDesignName("x".repeat(61))).toBeNull();
  });

  it("counts length in code points, so 60 emoji fit and 61 don't", () => {
    expect(validateDesignName("😀".repeat(60))).toBe("😀".repeat(60));
    expect(validateDesignName("😀".repeat(61))).toBeNull();
  });
});

describe("parseDesignVersion", () => {
  it("accepts plain positive integers", () => {
    expect(parseDesignVersion("5")).toBe(5);
    expect(parseDesignVersion("1234567890")).toBe(1234567890);
  });

  it.each(["0", "007", "1e3", "0x10", "1.5", " 5", "abc", ["5"], undefined])(
    "rejects %j",
    (input) => {
      expect(parseDesignVersion(input)).toBeNull();
    }
  );
});

describe("displayDesigns", () => {
  const base = {
    config: defaultConfig,
    pngUrl: "https://example.test/avatar.png",
    backgroundUrl: "https://example.test/background.svg",
    createdAt: "2026-11-01T12:00:00.000Z"
  };
  const raw: RawDesign[] = [
    { ...base, version: 1 },
    { ...base, version: 3, name: "Beach day" },
    { ...base, version: 2, config: undefined }
  ];

  it("sorts newest first, names unnamed designs, marks the current one and skips damaged ones", () => {
    const designs = displayDesigns(raw, 3);
    expect(designs.map((design) => design.version)).toEqual([3, 1]);
    expect(designs.map((design) => design.name)).toEqual(["Beach day", "Untitled 1"]);
    expect(designs.map((design) => design.isCurrent)).toEqual([true, false]);
  });
});

describe("shared editor defaults", () => {
  it("start without eyes and with the default skin palette", () => {
    expect(defaultConfig.selections.eyes).toBeNull();
    expect(defaultConfig.skinPaletteId).toBe(DEFAULT_SKIN_PALETTE.id);
  });
});

describe("formatShortAge", () => {
  const now = Date.parse("2026-11-11T12:00:00.000Z");
  const ago = (ms: number) => formatShortAge(new Date(now - ms).toISOString(), now);
  const s = 1000, m = 60 * s, h = 60 * m, d = 24 * h;

  it("uses the shortest unit that fits", () => {
    expect(ago(0)).toBe("now");
    expect(ago(4 * s)).toBe("now");
    expect(ago(33 * s)).toBe("33s ago");
    expect(ago(59 * s)).toBe("59s ago");
    expect(ago(m)).toBe("1m ago");
    expect(ago(59 * m)).toBe("59m ago");
    expect(ago(4 * h)).toBe("4h ago");
    expect(ago(23 * h)).toBe("23h ago");
    expect(ago(d)).toBe("1d ago");
    expect(ago(23 * d)).toBe("23d ago");
    expect(ago(29 * d)).toBe("29d ago");
    expect(ago(30 * d)).toBe("last month");
    expect(ago(59 * d)).toBe("last month");
    expect(ago(60 * d)).toBe("2mo ago");
    expect(ago(359 * d)).toBe("11mo ago");
    expect(ago(364 * d)).toBe("last year");
    expect(ago(365 * d)).toBe("last year");
    expect(ago(730 * d)).toBe("2y ago");
  });

  it("reads a future or invalid time as now", () => {
    expect(ago(-10 * m)).toBe("now");
    expect(formatShortAge("not a date", now)).toBe("now");
  });
});
