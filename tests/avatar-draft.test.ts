import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialSelections } from "@/config/avatar-options";
import type { AvatarConfig } from "@/lib/avatar-config";
import {
  clearDraftBackup,
  DRAFT_SCHEMA,
  draftBackupKey,
  draftStorageKey,
  readDraft,
  readDraftBackup,
  useAvatarDraft,
  writeDraft
} from "@/lib/avatar-draft";

function makeConfig(overrides: Partial<AvatarConfig["selections"]> = {}): AvatarConfig {
  return {
    selections: { ...createInitialSelections(), ...overrides },
    accessories: {},
    facialHairId: null,
    skinPaletteId: "1",
    hairPaletteId: "1",
    backgroundId: "solid-1"
  };
}

const defaults = makeConfig();

describe("draft storage", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("round-trips a config, including an incomplete one", () => {
    const config = makeConfig({ hair: "hair-1" });
    expect(writeDraft("abc123", config)).toBe(true);
    expect(readDraft("abc123", defaults)).toEqual(config);
  });

  it("keeps drafts separate per netid", () => {
    writeDraft("abc123", makeConfig({ eyes: "eyes-2" }));
    expect(readDraft("xyz789", defaults)).toBeNull();
  });

  it("ignores corrupt JSON and other schemas", () => {
    localStorage.setItem(draftStorageKey("abc123"), "{not json");
    expect(readDraft("abc123", defaults)).toBeNull();

    localStorage.setItem(
      draftStorageKey("abc123"),
      JSON.stringify({ schema: DRAFT_SCHEMA + 1, config: makeConfig({ eyes: "eyes-2" }) })
    );
    expect(readDraft("abc123", defaults)).toBeNull();
  });

  it("drops only the stale ids in an old draft", () => {
    localStorage.setItem(
      draftStorageKey("abc123"),
      JSON.stringify({
        schema: DRAFT_SCHEMA,
        config: { ...makeConfig({ eyes: "eyes-2" }), selections: { eyes: "eyes-2", hair: "gone" } }
      })
    );
    const draft = readDraft("abc123", defaults) as AvatarConfig;
    expect(draft.selections.eyes).toBe("eyes-2");
    expect(draft.selections.hair).toBeNull();
    expect(draft.selections.face).toBe(defaults.selections.face);
  });

  it("reports unavailable storage instead of throwing", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readDraft("abc123", defaults)).toBe("unavailable");
    expect(writeDraft("abc123", defaults)).toBe(false);
  });
});

describe("useAvatarDraft", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function renderDraft(netid: string | null, config = defaults) {
    const onRestore = vi.fn();
    const hook = renderHook(
      ({ config }) => useAvatarDraft({ config, defaults, netid, onRestore }),
      { initialProps: { config } }
    );
    return { ...hook, onRestore };
  }

  it("restores a saved draft without overwriting it with the defaults", () => {
    const saved = makeConfig({ eyes: "eyes-3" });
    writeDraft("abc123", saved);
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    const { onRestore, result, rerender } = renderDraft("abc123");
    expect(onRestore).toHaveBeenCalledWith(saved, "load");
    expect(result.current).toBe("restored");

    act(() => vi.advanceTimersByTime(1000));
    rerender({ config: saved });
    act(() => vi.advanceTimersByTime(1000));
    expect(setItem).not.toHaveBeenCalled();
    expect(readDraft("abc123", defaults)).toEqual(saved);
  });

  it("does not write a draft until something changes", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const { result, unmount } = renderDraft("abc123");
    expect(result.current).toBe("fresh");
    act(() => vi.advanceTimersByTime(1000));
    unmount();
    expect(setItem).not.toHaveBeenCalled();
  });

  it("debounces edits into a single write", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const { rerender } = renderDraft("abc123");

    rerender({ config: makeConfig({ eyes: "eyes-1" }) });
    rerender({ config: makeConfig({ eyes: "eyes-2" }) });
    expect(setItem).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(300));
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(readDraft("abc123", defaults)).toEqual(makeConfig({ eyes: "eyes-2" }));
  });

  it("flushes a pending edit when the page is hidden or the editor unmounts", () => {
    const { rerender, unmount } = renderDraft("abc123");

    rerender({ config: makeConfig({ mouth: "mouth-1" }) });
    window.dispatchEvent(new Event("pagehide"));
    expect(readDraft("abc123", defaults)).toEqual(makeConfig({ mouth: "mouth-1" }));

    rerender({ config: makeConfig({ mouth: "mouth-2" }) });
    unmount();
    expect(readDraft("abc123", defaults)).toEqual(makeConfig({ mouth: "mouth-2" }));
  });

  it("follows a draft written by another tab", () => {
    const { onRestore } = renderDraft("abc123");
    const other = makeConfig({ eyes: "eyes-4" });
    writeDraft("abc123", other);

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: draftStorageKey("abc123"),
        newValue: localStorage.getItem(draftStorageKey("abc123")),
        storageArea: localStorage
      })
    );
    expect(onRestore).toHaveBeenLastCalledWith(other, "other-tab");
  });

  it("keeps editing when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result, rerender } = renderDraft("abc123");
    expect(result.current).toBe("unavailable");
    rerender({ config: makeConfig({ eyes: "eyes-1" }) });
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe("unavailable");
  });

  it("is disabled without a netid", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const { result, rerender } = renderDraft(null);
    rerender({ config: makeConfig({ eyes: "eyes-1" }) });
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe("disabled");
    expect(setItem).not.toHaveBeenCalled();
  });

  describe("opening a design (initial)", () => {
    const initial = makeConfig({ eyes: "eyes-2", mouth: "mouth-1" });

    function renderOpened(netid: string | null = "abc123") {
      const onRestore = vi.fn();
      const hook = renderHook(
        ({ config }) => useAvatarDraft({ config, defaults, netid, onRestore, initial }),
        { initialProps: { config: initial } }
      );
      return { ...hook, onRestore };
    }

    it("backs up a different stored draft instead of restoring or overwriting it", () => {
      const old = makeConfig({ brows: "brows-1" });
      writeDraft("abc123", old);

      const { onRestore, result, rerender } = renderOpened();
      expect(onRestore).not.toHaveBeenCalled();
      expect(result.current).toBe("opened");
      expect(readDraftBackup("abc123", defaults)).toEqual(old);

      act(() => vi.advanceTimersByTime(1000));
      expect(readDraft("abc123", defaults)).toEqual(old);

      const edited = makeConfig({ eyes: "eyes-2", mouth: "mouth-2" });
      rerender({ config: edited });
      expect(readDraft("abc123", defaults)).toEqual(old);
      act(() => vi.advanceTimersByTime(300));
      expect(readDraft("abc123", defaults)).toEqual(edited);
      expect(readDraftBackup("abc123", defaults)).toEqual(old);
    });

    it("makes no backup when the stored draft equals the opened design", () => {
      writeDraft("abc123", initial);
      const { result } = renderOpened();
      expect(result.current).toBe("opened");
      expect(localStorage.getItem(draftBackupKey("abc123"))).toBeNull();
      expect(readDraftBackup("abc123", defaults)).toBeNull();
    });

    it("clears a backup left over from an earlier open when this open makes none", () => {
      // An earlier open backed up some edits that were never brought back...
      localStorage.setItem(
        draftBackupKey("abc123"),
        JSON.stringify({ schema: 1, config: makeConfig({ hair: "hair-1" }), updatedAt: "" })
      );
      // ...and now a design is opened over a draft equal to it.
      writeDraft("abc123", initial);

      renderOpened();
      expect(readDraftBackup("abc123", defaults)).toBeNull();
    });

    it("doesn't touch the main draft key while opening, so other tabs aren't notified", () => {
      writeDraft("abc123", makeConfig({ brows: "brows-1" }));
      const setItem = vi.spyOn(Storage.prototype, "setItem");

      renderOpened();
      act(() => vi.advanceTimersByTime(1000));

      expect(setItem).toHaveBeenCalledWith(draftBackupKey("abc123"), expect.any(String));
      expect(setItem).not.toHaveBeenCalledWith(draftStorageKey("abc123"), expect.anything());
    });

    it("still opens the design when storage is blocked", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("blocked");
      });

      const { onRestore, result } = renderOpened();
      expect(result.current).toBe("opened");
      expect(onRestore).not.toHaveBeenCalled();
      expect(readDraftBackup("abc123", defaults)).toBeNull();
    });

    it("clears the backup", () => {
      writeDraft("abc123", makeConfig({ brows: "brows-1" }));
      renderOpened();
      expect(localStorage.getItem(draftBackupKey("abc123"))).not.toBeNull();

      clearDraftBackup("abc123");
      expect(localStorage.getItem(draftBackupKey("abc123"))).toBeNull();
      expect(draftBackupKey("abc123")).toBe("yalemoji:draft-backup:v1:abc123");
    });
  });
});
