import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialSelections } from "@/config/avatar-options";
import type { AvatarConfig } from "@/lib/avatar-config";
import {
  DRAFT_SCHEMA,
  draftStorageKey,
  readDraft,
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
});
