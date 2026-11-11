import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialSelections } from "@/config/avatar-options";

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn(async () => ({ netid: "abc123" })) }));
vi.mock("@/lib/avatar-render", () => ({ renderAvatarAssets: vi.fn() }));
vi.mock("@/lib/avatar-storage", () => ({ uploadAvatarAssets: vi.fn() }));
vi.mock("@/lib/avatar-store", () => ({
  checkAvatarSaveRateLimit: vi.fn(async () => ({ allowed: true, retryAfterSeconds: 0 })),
  commitAvatarVersion: vi.fn(),
  countDesigns: vi.fn(async () => 2),
  getAvatarId: vi.fn(() => "avatar-id"),
  reserveNextVersion: vi.fn(async () => 1)
}));

const { POST } = await import("@/app/api/avatar/route");
const { renderAvatarAssets } = await import("@/lib/avatar-render");
const { uploadAvatarAssets } = await import("@/lib/avatar-storage");
const { commitAvatarVersion, countDesigns, reserveNextVersion } = await import(
  "@/lib/avatar-store"
);

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

function mockSuccessfulRender() {
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
}

const completeSelections = { ...createInitialSelections(), eyes: "eyes-1", mouth: "mouth-1" };

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
    expect(commitAvatarVersion).toHaveBeenCalledWith("abc123", 1, expect.objectContaining({ setAsCurrent: true }));
  });

  it("generates and uploads a design without setting it as current", async () => {
    vi.mocked(renderAvatarAssets).mockResolvedValue({ svg: "<svg/>", png: Buffer.from(""), backgroundSvg: "<svg/>" });
    vi.mocked(uploadAvatarAssets).mockResolvedValue({ svgUrl: "s", pngUrl: "p", backgroundUrl: "b" });
    const request = saveRequest({ ...createInitialSelections(), eyes: "eyes-1", mouth: "mouth-1" });
    const config = { ...await request.json(), skinColorPosition: 0.51, hairColorPosition: 5.25, setAsCurrent: false };
    const response = await POST(new NextRequest("http://localhost/api/avatar", { method: "POST", body: JSON.stringify(config) }));
    expect(response.status).toBe(200);
    expect(renderAvatarAssets).toHaveBeenCalledWith(expect.objectContaining({ skinColorPosition: 0.51, hairColorPosition: 5.25 }));
    expect(uploadAvatarAssets).toHaveBeenCalledOnce();
    expect(commitAvatarVersion).toHaveBeenCalledWith("abc123", 1, expect.objectContaining({ setAsCurrent: false }));
  });

  it("names a new save from the number of existing designs", async () => {
    mockSuccessfulRender();
    const response = await POST(saveRequest(completeSelections));

    expect(response.status).toBe(200);
    expect(countDesigns).toHaveBeenCalledWith("abc123");
    expect(commitAvatarVersion).toHaveBeenCalledWith(
      "abc123",
      1,
      expect.objectContaining({ name: "Untitled 3" })
    );
  });

  it("still saves, as Untitled, when the design count fails", async () => {
    mockSuccessfulRender();
    vi.mocked(countDesigns).mockRejectedValueOnce(new Error("count failed"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(saveRequest(completeSelections));
    error.mockRestore();

    expect(response.status).toBe(200);
    expect(commitAvatarVersion).toHaveBeenCalledWith(
      "abc123",
      1,
      expect.objectContaining({ name: "Untitled" })
    );
  });
});
