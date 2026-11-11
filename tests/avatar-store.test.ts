import { expect, it, vi } from "vitest";
import type { Firestore } from "@google-cloud/firestore";
import { commitAvatarVersion } from "@/lib/avatar-store";
import { createInitialSelections } from "@/config/avatar-options";

it.each([false, true])("saves the version and only promotes it when requested (%s)", async (setAsCurrent) => {
  const versionRef = { path: "users/abc123/avatars/2" };
  const userRef = { path: "users/abc123", collection: () => ({ doc: () => versionRef }) };
  const set = vi.fn();
  const transaction = { get: async () => ({ exists: true, get: () => 1 }), set };
  const db = {
    collection: () => ({ doc: () => userRef }),
    runTransaction: async (callback: (value: typeof transaction) => Promise<void>) => callback(transaction)
  } as unknown as Firestore;
  await commitAvatarVersion("abc123", 2, {
    avatarId: "id", setAsCurrent,
    config: { selections: createInitialSelections(), accessories: {}, facialHairId: null,
      skinPaletteId: "1", hairPaletteId: "1", backgroundId: "solid-1", skinColorPosition: 0.51 },
    pngUrl: "png", svgUrl: "svg", backgroundUrl: "background"
  }, db);
  expect(set).toHaveBeenCalledWith(versionRef, expect.objectContaining({ config: expect.objectContaining({ skinColorPosition: 0.51 }) }), { merge: true });
  const promotions = set.mock.calls.filter(([ref]) => ref === userRef);
  expect(promotions).toHaveLength(setAsCurrent ? 1 : 0);
});
