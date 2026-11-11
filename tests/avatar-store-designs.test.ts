import type { Firestore } from "@google-cloud/firestore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteDesign, getAvatarId, getDesign, renameDesign } from "@/lib/avatar-store";

type Data = Record<string, unknown>;

function fakeFirestore(initial: Record<string, Data> = {}) {
  const docs = new Map<string, Data>(Object.entries(initial));

  function snapshot(path: string) {
    const data = docs.get(path);
    return {
      exists: data !== undefined,
      id: path.split("/").at(-1)!,
      get: (field: string) => data?.[field],
      data: () => data
    };
  }

  function doc(path: string) {
    return {
      path,
      get: async () => snapshot(path),
      update: async (patch: Data) => {
        const data = docs.get(path);
        if (!data) throw Object.assign(new Error("NOT_FOUND"), { code: 5 });
        docs.set(path, { ...data, ...patch });
      },
      delete: async () => {
        docs.delete(path);
      },
      collection: (name: string) => collection(`${path}/${name}`)
    };
  }

  function collection(path: string) {
    return {
      doc: (id: string) => doc(`${path}/${id}`),
      count: () => ({
        get: async () => ({
          data: () => ({
            count: [...docs.keys()].filter(
              (key) => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes("/")
            ).length
          })
        })
      })
    };
  }

  const db = {
    collection,
    runTransaction: async <T,>(
      run: (transaction: {
        get: (ref: { path: string }) => Promise<ReturnType<typeof snapshot>>;
        delete: (ref: { path: string }) => void;
      }) => Promise<T>
    ) =>
      run({
        get: async (ref) => snapshot(ref.path),
        delete: (ref) => {
          docs.delete(ref.path);
        }
      })
  };

  return { db: db as unknown as Firestore, docs };
}

const version = {
  config: { selections: {} },
  pngUrl: "https://example.test/avatar.png",
  backgroundUrl: "https://example.test/background.svg"
};

describe("design store functions", () => {
  beforeEach(() => {
    process.env.YALEMOJI_ASSET_ID_SECRET = "test-secret";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("deleteDesign", () => {
    it("returns not_found for a missing design and marks nothing", async () => {
      const { db } = fakeFirestore({ "users/abc123": { avatarVersion: 5 } });
      const mark = vi.fn(async () => {});

      await expect(deleteDesign("abc123", 4, db, mark)).resolves.toBe("not_found");
      expect(mark).not.toHaveBeenCalled();
    });

    it("refuses to remove the current design", async () => {
      const { db, docs } = fakeFirestore({
        "users/abc123": { avatarVersion: 5 },
        "users/abc123/avatars/5": version
      });
      const mark = vi.fn(async () => {});

      await expect(deleteDesign("abc123", 5, db, mark)).resolves.toBe("current");
      expect(docs.has("users/abc123/avatars/5")).toBe(true);
      expect(mark).not.toHaveBeenCalled();
    });

    it("removes a design that isn't current and marks its files", async () => {
      const { db, docs } = fakeFirestore({
        "users/abc123": { avatarVersion: 5 },
        "users/abc123/avatars/4": version
      });
      const mark = vi.fn(async () => {});

      await expect(deleteDesign("abc123", 4, db, mark)).resolves.toBe("ok");
      expect(docs.has("users/abc123/avatars/4")).toBe(false);
      expect(mark).toHaveBeenCalledTimes(1);
      expect(mark).toHaveBeenCalledWith(getAvatarId("abc123"), 4);
    });

    it("still succeeds when marking fails, and logs it", async () => {
      const { db } = fakeFirestore({
        "users/abc123": { avatarVersion: 5 },
        "users/abc123/avatars/4": version
      });
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      const mark = vi.fn(async () => {
        throw new Error("storage down");
      });

      await expect(deleteDesign("abc123", 4, db, mark)).resolves.toBe("ok");
      expect(error).toHaveBeenCalledWith(
        expect.objectContaining({ event: "asset_mark_failed", version: 4 })
      );
    });
  });

  describe("renameDesign", () => {
    it("renames an existing design", async () => {
      const { db, docs } = fakeFirestore({ "users/abc123/avatars/4": version });

      await expect(renameDesign("abc123", 4, "Beach day", db)).resolves.toBe("ok");
      expect(docs.get("users/abc123/avatars/4")).toMatchObject({ name: "Beach day" });
    });

    it("returns not_found without creating the document", async () => {
      const { db, docs } = fakeFirestore();

      await expect(renameDesign("abc123", 4, "Beach day", db)).resolves.toBe("not_found");
      expect(docs.has("users/abc123/avatars/4")).toBe(false);
    });
  });

  describe("getDesign", () => {
    it("returns the design with its display name", async () => {
      const { db } = fakeFirestore({ "users/abc123/avatars/4": version });

      await expect(getDesign("abc123", 4, db)).resolves.toEqual({
        version: 4,
        name: "Untitled 4",
        config: version.config
      });
    });

    it("returns null for a document with no config", async () => {
      const { db } = fakeFirestore({
        "users/abc123/avatars/4": { pngUrl: version.pngUrl, backgroundUrl: version.backgroundUrl }
      });

      await expect(getDesign("abc123", 4, db)).resolves.toBeNull();
    });
  });
});
