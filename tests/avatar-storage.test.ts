import type { Bucket } from "@google-cloud/storage";
import { describe, expect, it, vi } from "vitest";
import { markAvatarAssetsForDeletion } from "@/lib/avatar-storage";

type FakeFile = {
  getMetadata: ReturnType<typeof vi.fn>;
  setMetadata: ReturnType<typeof vi.fn>;
};

function fakeBucket(overrides: Record<string, Partial<FakeFile>> = {}) {
  const files = new Map<string, FakeFile>();
  const bucket = {
    file(path: string) {
      let file = files.get(path);
      if (!file) {
        file = {
          getMetadata: vi.fn(async () => [{}]),
          setMetadata: vi.fn(async () => [{}]),
          ...overrides[path]
        };
        files.set(path, file);
      }
      return file;
    }
  };
  return { bucket: bucket as unknown as Bucket, files };
}

describe("markAvatarAssetsForDeletion", () => {
  it("stamps customTime on exactly the three files of the version", async () => {
    const { bucket, files } = fakeBucket();

    await markAvatarAssetsForDeletion("aid", 4, bucket);

    expect([...files.keys()].sort()).toEqual([
      "avatars/aid/4/avatar.png",
      "avatars/aid/4/avatar.svg",
      "avatars/aid/4/background.svg"
    ]);
    for (const file of files.values()) {
      expect(file.setMetadata).toHaveBeenCalledTimes(1);
      const [metadata] = file.setMetadata.mock.calls[0];
      expect(Object.keys(metadata)).toEqual(["customTime"]);
      expect(new Date(metadata.customTime).toISOString()).toBe(metadata.customTime);
    }
  });

  it("leaves a file that already has a customTime alone", async () => {
    const { bucket, files } = fakeBucket({
      "avatars/aid/4/avatar.png": {
        getMetadata: vi.fn(async () => [{ customTime: "2026-11-01T00:00:00.000Z" }])
      }
    });

    await markAvatarAssetsForDeletion("aid", 4, bucket);

    expect(files.get("avatars/aid/4/avatar.png")!.setMetadata).not.toHaveBeenCalled();
    expect(files.get("avatars/aid/4/avatar.svg")!.setMetadata).toHaveBeenCalledTimes(1);
  });

  it("ignores a missing file", async () => {
    const { bucket, files } = fakeBucket({
      "avatars/aid/4/background.svg": {
        getMetadata: vi.fn(async () => {
          throw { code: 404 };
        })
      }
    });

    await expect(markAvatarAssetsForDeletion("aid", 4, bucket)).resolves.toBeUndefined();
    expect(files.get("avatars/aid/4/background.svg")!.setMetadata).not.toHaveBeenCalled();
  });
});
