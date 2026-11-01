import { useEffect, useRef, useState } from "react";
import { accessoryTypes, avatarCategories } from "@/config/avatar-options";
import { sanitizeAvatarConfig, type AvatarConfig } from "./avatar-config";

// Unsaved editor state, autosaved to localStorage per netid so a reload, closed
// tab or login redirect doesn't lose edits. Only option ids are stored, and they
// are re-checked against the option lists on load (sanitizeAvatarConfig), so
// stale or hand-edited storage can't break the editor.
//
// This module only knows about AvatarConfig, not the editor's UI, so the editor
// can be restructured freely as long as it still produces and accepts one.

export const DRAFT_SCHEMA = 1;
const WRITE_DELAY_MS = 300;

type StoredDraft = {
  schema: typeof DRAFT_SCHEMA;
  config: AvatarConfig;
  updatedAt: string;
};

export type DraftStatus = "loading" | "restored" | "fresh" | "unavailable" | "disabled";
export type DraftRestoreSource = "load" | "other-tab";

export function draftStorageKey(netid: string) {
  return `yalemoji:draft:v${DRAFT_SCHEMA}:${netid}`;
}

// Fixed key order, so equal configs always serialize identically.
export function serializeAvatarConfig(config: AvatarConfig): string {
  return JSON.stringify({
    selections: Object.fromEntries(
      avatarCategories.map((category) => [category, config.selections[category] ?? null])
    ),
    accessories: Object.fromEntries(
      accessoryTypes.flatMap((type) =>
        config.accessories[type] ? [[type, config.accessories[type]]] : []
      )
    ),
    facialHairId: config.facialHairId,
    skinPaletteId: config.skinPaletteId,
    hairPaletteId: config.hairPaletteId,
    backgroundId: config.backgroundId
  });
}

function parseDraft(raw: string | null, defaults: AvatarConfig): AvatarConfig | null {
  if (raw === null) return null;
  let stored: unknown;
  try {
    stored = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof stored !== "object" || stored === null) return null;
  if ((stored as Partial<StoredDraft>).schema !== DRAFT_SCHEMA) return null;
  return sanitizeAvatarConfig((stored as Partial<StoredDraft>).config, defaults);
}

// Returns the stored draft, null when there is none (or it is unusable), or
// "unavailable" when storage itself can't be read (private mode, blocked).
export function readDraft(
  netid: string,
  defaults: AvatarConfig
): AvatarConfig | null | "unavailable" {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(draftStorageKey(netid));
  } catch {
    return "unavailable";
  }
  return parseDraft(raw, defaults);
}

export function writeDraft(netid: string, config: AvatarConfig): boolean {
  const draft: StoredDraft = {
    schema: DRAFT_SCHEMA,
    config: JSON.parse(serializeAvatarConfig(config)),
    updatedAt: new Date().toISOString()
  };
  try {
    window.localStorage.setItem(draftStorageKey(netid), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(netid: string) {
  try {
    window.localStorage.removeItem(draftStorageKey(netid));
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

// Restores the draft once after mount (never during render, which would break
// hydration), then autosaves `config` whenever it changes. Writes are held back
// until the restore has run, so the default avatar shown on first render can
// never overwrite a real draft. Without a netid, drafts are disabled.
export function useAvatarDraft({
  config,
  defaults,
  netid,
  onRestore
}: {
  config: AvatarConfig;
  defaults: AvatarConfig;
  netid?: string | null;
  onRestore: (config: AvatarConfig, source: DraftRestoreSource) => void;
}): DraftStatus {
  const [status, setStatus] = useState<DraftStatus>(netid ? "loading" : "disabled");
  const serialized = serializeAvatarConfig(config);

  const latest = useRef({ config, defaults, onRestore, serialized });
  latest.current = { config, defaults, onRestore, serialized };
  const loaded = useRef(false);
  const lastWritten = useRef<string | null>(null);
  const pendingWrite = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The autosave effect's first run after a restore still sees the pre-restore
  // config (the editor hasn't re-rendered yet), so it must not write.
  const skipNextAutosave = useRef(false);

  // Restore on mount, and listen for drafts written by other tabs.
  useEffect(() => {
    loaded.current = false;
    lastWritten.current = null;
    if (!netid) {
      setStatus("disabled");
      return;
    }

    const draft = readDraft(netid, latest.current.defaults);
    if (draft === "unavailable") {
      setStatus("unavailable");
      return;
    }
    if (draft) {
      lastWritten.current = serializeAvatarConfig(draft);
      skipNextAutosave.current = true;
      latest.current.onRestore(draft, "load");
      setStatus("restored");
    } else {
      // Nothing to write until the user actually changes something.
      lastWritten.current = latest.current.serialized;
      setStatus("fresh");
    }
    loaded.current = true;

    const key = draftStorageKey(netid);
    function onStorage(event: StorageEvent) {
      if (event.key !== key || event.storageArea !== window.localStorage) return;
      // Local edits waiting to be written win; otherwise follow the other tab.
      if (pendingWrite.current) return;
      const draft = parseDraft(event.newValue, latest.current.defaults);
      if (!draft) return;
      const next = serializeAvatarConfig(draft);
      if (next === latest.current.serialized) return;
      lastWritten.current = next;
      latest.current.onRestore(draft, "other-tab");
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [netid]);

  // Debounced autosave, flushed when the page is hidden or the editor unmounts.
  useEffect(() => {
    if (!netid) return;

    function flush() {
      if (pendingWrite.current) {
        clearTimeout(pendingWrite.current);
        pendingWrite.current = null;
      }
      if (!loaded.current || !netid) return;
      const { config, serialized } = latest.current;
      if (serialized === lastWritten.current) return;
      if (writeDraft(netid, config)) lastWritten.current = serialized;
      else setStatus("unavailable");
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") flush();
    }

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      flush();
    };
  }, [netid]);

  useEffect(() => {
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    if (!netid || !loaded.current || serialized === lastWritten.current) return;
    if (pendingWrite.current) clearTimeout(pendingWrite.current);
    pendingWrite.current = setTimeout(() => {
      pendingWrite.current = null;
      if (writeDraft(netid, latest.current.config)) {
        lastWritten.current = latest.current.serialized;
      } else {
        setStatus("unavailable");
      }
    }, WRITE_DELAY_MS);
  }, [netid, serialized]);

  return status;
}
