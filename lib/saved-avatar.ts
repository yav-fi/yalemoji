export const SAVED_AVATAR_STORAGE_KEY = "yalemoji:saved-avatar:v1";
export const SAVED_AVATAR_EVENT = "yalemoji:saved-avatar-updated";

export type SavedAvatar = {
  backgroundId: string;
  imageDataUrl: string;
  savedAt: string;
};

function isSavedAvatar(value: unknown): value is SavedAvatar {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SavedAvatar>;
  return (
    typeof candidate.backgroundId === "string" &&
    typeof candidate.savedAt === "string" &&
    typeof candidate.imageDataUrl === "string" &&
    candidate.imageDataUrl.startsWith("data:image/png")
  );
}

export function readSavedAvatar(): SavedAvatar | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SAVED_AVATAR_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSavedAvatar(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveAvatarLocally(savedAvatar: SavedAvatar) {
  window.localStorage.setItem(
    SAVED_AVATAR_STORAGE_KEY,
    JSON.stringify(savedAvatar)
  );
  window.dispatchEvent(new Event(SAVED_AVATAR_EVENT));
}
