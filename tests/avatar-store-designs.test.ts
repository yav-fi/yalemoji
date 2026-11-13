import type { Firestore } from "@google-cloud/firestore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  commitAvatarVersion,
  deleteDesign,
  getAvatarId,
  getDesign,
  makeDesignCurrent,
  renameDesign
} from "@/lib/avatar-store";

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
        set: (ref: { path: string }, data: Data, options?: { merge?: boolean }) => void;
      }) => Promise<T>
    ) =>
      run({
        get: async (ref) => snapshot(ref.path),
        delete: (ref) => {
          docs.delete(ref.path);
        },
        set: (ref, data, options) => {
          docs.set(ref.path, options?.merge ? { ...docs.get(ref.path), ...data } : data);
        }
      })
  };

  return { db: db as unknown as Firestore, docs };
}

const version = {
  config: { selections: {} },
  pngUrl: "https://example.test/avatar.png",
  svgUrl: "https://example.test/avatar.svg",
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

  describe("makeDesignCurrent", () => {
    const user = {
      avatarVersion: 5,
      versionCounter: 5,
      pngUrl: "https://example.test/5/avatar.png",
      svgUrl: "https://example.test/5/avatar.svg",
      backgroundUrl: "https://example.test/5/background.svg"
    };

    it("points the live avatar at an older design's existing files", async () => {
      const { db, docs } = fakeFirestore({
        "users/abc123": user,
        "users/abc123/avatars/2": version
      });

      await expect(makeDesignCurrent("abc123", 2, db)).resolves.toBe("ok");
      expect(docs.get("users/abc123")).toMatchObject({
        avatarVersion: 2,
        versionCounter: 5,
        pngUrl: version.pngUrl,
        svgUrl: version.svgUrl,
        backgroundUrl: version.backgroundUrl
      });
    });

    it("returns not_found for a missing design and changes nothing", async () => {
      const { db, docs } = fakeFirestore({ "users/abc123": user });

      await expect(makeDesignCurrent("abc123", 2, db)).resolves.toBe("not_found");
      expect(docs.get("users/abc123")).toEqual(user);
    });

    it("treats a damaged design as not found", async () => {
      const { db, docs } = fakeFirestore({
        "users/abc123": user,
        "users/abc123/avatars/2": { config: { selections: {} }, pngUrl: version.pngUrl }
      });

      await expect(makeDesignCurrent("abc123", 2, db)).resolves.toBe("not_found");
      expect(docs.get("users/abc123")).toEqual(user);
    });

    it("succeeds without writing when the design is already current", async () => {
      const { db, docs } = fakeFirestore({
        "users/abc123": user,
        "users/abc123/avatars/5": version
      });

      await expect(makeDesignCurrent("abc123", 5, db)).resolves.toBe("ok");
      expect(docs.get("users/abc123")).toEqual(user);
    });
  });

  describe("the editor's checkmark save (commitAvatarVersion)", () => {
    const save = (setAsCurrent: boolean) => ({
      avatarId: "aid",
      setAsCurrent,
      config: { selections: {} } as never,
      pngUrl: "https://example.test/6/avatar.png",
      svgUrl: "https://example.test/6/avatar.svg",
      backgroundUrl: "https://example.test/6/background.svg",
      name: "Untitled 3"
    });

    it("adds a named design and makes it current, even after an older one was made current", async () => {
      // Version 2 was made current from the Designs page while 5 already existed.
      const { db, docs } = fakeFirestore({
        "users/abc123": { avatarVersion: 2, versionCounter: 5 },
        "users/abc123/avatars/2": version
      });

      await commitAvatarVersion("abc123", 6, save(true), db);

      expect(docs.get("users/abc123/avatars/6")).toMatchObject({ name: "Untitled 3" });
      expect(docs.get("users/abc123")).toMatchObject({
        avatarVersion: 6,
        pngUrl: "https://example.test/6/avatar.png"
      });
    });

    it("adds a named design without making it current when asked not to", async () => {
      const { db, docs } = fakeFirestore({
        "users/abc123": { avatarVersion: 2, versionCounter: 5 },
        "users/abc123/avatars/2": version
      });

      await commitAvatarVersion("abc123", 6, save(false), db);

      expect(docs.get("users/abc123/avatars/6")).toMatchObject({ name: "Untitled 3" });
      expect(docs.get("users/abc123")).toMatchObject({ avatarVersion: 2 });
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
