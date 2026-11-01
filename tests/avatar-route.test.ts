import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialSelections } from "@/config/avatar-options";

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn(async () => ({ netid: "abc123" })) }));
vi.mock("@/lib/avatar-render", () => ({ renderAvatarAssets: vi.fn() }));
vi.mock("@/lib/avatar-storage", () => ({ uploadAvatarAssets: vi.fn() }));
vi.mock("@/lib/avatar-store", () => ({
  checkAvatarSaveRateLimit: vi.fn(async () => ({ allowed: true, retryAfterSeconds: 0 })),
  commitAvatarVersion: vi.fn(),
  getAvatarId: vi.fn(() => "avatar-id"),
  reserveNextVersion: vi.fn(async () => 1)
}));

const { POST } = await import("@/app/api/avatar/route");
const { renderAvatarAssets } = await import("@/lib/avatar-render");
const { uploadAvatarAssets } = await import("@/lib/avatar-storage");
const { reserveNextVersion } = await import("@/lib/avatar-store");

function saveRequest(selections: Record<string, string | null>) {
  return new NextRequest("http://localhost/api/avatar", {
    method: "POST",
    body: JSON.stringify({
      selections,
      accessories: {},
      facialHairId: null,
      skinPaletteId: "1",
      hairPaletteId: "1",
      backgroundId: "solid-1"
    })
  });
}

describe("POST /api/avatar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects an avatar without eyes or a mouth before using a version", async () => {
    const selections = { ...createInitialSelections(), eyes: "eyes-1" };
    const response = await POST(saveRequest(selections));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "incomplete_avatar", missing: ["mouth"] });
    expect(reserveNextVersion).not.toHaveBeenCalled();
    expect(renderAvatarAssets).not.toHaveBeenCalled();
    expect(uploadAvatarAssets).not.toHaveBeenCalled();
  });

  it("proceeds to save a complete avatar", async () => {
    vi.mocked(renderAvatarAssets).mockResolvedValue({
      svg: "<svg/>",
      png: Buffer.from(""),
      backgroundSvg: "<svg/>"
    });
    vi.mocked(uploadAvatarAssets).mockResolvedValue({
      svgUrl: "s",
      pngUrl: "p",
      backgroundUrl: "b"
    });
    const selections = { ...createInitialSelections(), eyes: "eyes-1", mouth: "mouth-1" };
    const response = await POST(saveRequest(selections));

    expect(response.status).toBe(200);
    expect(reserveNextVersion).toHaveBeenCalledWith("abc123");
  });
});
