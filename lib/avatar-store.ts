import { FieldValue, Firestore } from "@google-cloud/firestore";
import { getFirestore } from "./firestore-store";
import { hashValue } from "./hash";
import { decideRateLimit } from "./rate-limit";
import type { AvatarConfig } from "./avatar-config";
import { markAvatarAssetsForDeletion } from "./avatar-storage";
import {
  displayDesigns,
  MAX_LISTED_DESIGNS,
  validateDesignName,
  type Design,
  type RawDesign
} from "./designs";

const AVATAR_SAVE_LIMIT = 20;
const AVATAR_SAVE_WINDOW_MS = 60 * 60 * 1000;
const AVATAR_READ_LIMIT = 300;
const AVATAR_READ_WINDOW_MS = 60 * 1000;
// Per API key: a consuming app's server may proxy many users' page loads.
const API_KEY_READ_LIMIT = 1200;
const API_KEY_READ_WINDOW_MS = 60 * 1000;
export const MAX_BATCH_LOOKUP = 100;
const DESIGN_EDIT_LIMIT = 60;
const DESIGN_EDIT_WINDOW_MS = 60 * 60 * 1000;

export type CurrentAvatar = {
  version: number;
  pngUrl: string;
  svgUrl: string;
  backgroundUrl: string;
};

export function getAvatarId(netid: string): string {
  const secret = process.env.YALEMOJI_ASSET_ID_SECRET;
  if (!secret) throw new Error("YALEMOJI_ASSET_ID_SECRET is not configured.");
  return hashValue(netid, secret).slice(0, 16);
}

async function checkFirestoreRateLimit(
  db: Firestore,
  key: string,
  limit: number,
  windowMs: number,
  nowMs: number,
  extraFields: Record<string, unknown>
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const windowStart = Math.floor(nowMs / windowMs) * windowMs;
  const rateLimitRef = db.collection("rateLimits").doc(`${key}:${windowStart}`);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(rateLimitRef);
    const currentCount = snapshot.exists ? Number(snapshot.get("count") ?? 0) : 0;
    const decision = decideRateLimit(currentCount, nowMs, limit, windowMs);

    if (!decision.allowed) {
      return { allowed: false, retryAfterSeconds: decision.retryAfterSeconds };
    }

    transaction.set(
      rateLimitRef,
      {
        count: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
        expiresAt: new Date(windowStart + windowMs * 2),
        ...extraFields
      },
      { merge: true }
    );

    return { allowed: true, retryAfterSeconds: 0 };
  });
}

export function checkAvatarSaveRateLimit(
  netid: string,
  nowMs = Date.now(),
  db: Firestore = getFirestore()
) {
  return checkFirestoreRateLimit(
    db,
    `avatar-save:${netid}`,
    AVATAR_SAVE_LIMIT,
    AVATAR_SAVE_WINDOW_MS,
    nowMs,
    { netid }
  );
}

export function checkAvatarReadRateLimit(
  ipHash: string,
  nowMs = Date.now(),
  db: Firestore = getFirestore()
) {
  return checkFirestoreRateLimit(
    db,
    `avatar-read:${ipHash}`,
    AVATAR_READ_LIMIT,
    AVATAR_READ_WINDOW_MS,
    nowMs,
    { ipHash }
  );
}

export function checkApiKeyReadRateLimit(
  keyId: string,
  nowMs = Date.now(),
  db: Firestore = getFirestore()
) {
  return checkFirestoreRateLimit(
    db,
    `avatar-read-key:${keyId}`,
    API_KEY_READ_LIMIT,
    API_KEY_READ_WINDOW_MS,
    nowMs,
    { keyId }
  );
}

export function checkDesignEditRateLimit(
  netid: string,
  nowMs = Date.now(),
  db: Firestore = getFirestore()
) {
  return checkFirestoreRateLimit(
    db,
    `design-edit:${netid}`,
    DESIGN_EDIT_LIMIT,
    DESIGN_EDIT_WINDOW_MS,
    nowMs,
    { netid }
  );
}

export async function recordLogin(
  netid: string,
  db: Firestore = getFirestore()
): Promise<void> {
  const userRef = db.collection("users").doc(netid);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);
    transaction.set(
      userRef,
      {
        ...(snapshot.exists ? {} : { firstSeenAt: FieldValue.serverTimestamp() }),
        lastLoginAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  });
}

export async function reserveNextVersion(
  netid: string,
  db: Firestore = getFirestore()
): Promise<number> {
  const userRef = db.collection("users").doc(netid);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);
    const current = snapshot.exists ? Number(snapshot.get("versionCounter") ?? 0) : 0;
    const next = current + 1;

    transaction.set(userRef, { versionCounter: next }, { merge: true });
    return next;
  });
}

export async function commitAvatarVersion(
  netid: string,
  version: number,
  data: {
    avatarId: string;
    config: AvatarConfig;
    pngUrl: string;
    svgUrl: string;
    backgroundUrl: string;
    name: string;
  },
  db: Firestore = getFirestore()
): Promise<void> {
  const userRef = db.collection("users").doc(netid);
  const versionRef = userRef.collection("avatars").doc(String(version));

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);
    const currentVersion = snapshot.exists ? Number(snapshot.get("avatarVersion") ?? 0) : 0;

    transaction.set(
      versionRef,
      {
        name: data.name,
        config: data.config,
        pngUrl: data.pngUrl,
        svgUrl: data.svgUrl,
        backgroundUrl: data.backgroundUrl,
        createdAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    if (version > currentVersion) {
      transaction.set(
        userRef,
        {
          avatarId: data.avatarId,
          avatarVersion: version,
          pngUrl: data.pngUrl,
          svgUrl: data.svgUrl,
          backgroundUrl: data.backgroundUrl,
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    }
  });
}

function avatarsCollection(netid: string, db: Firestore) {
  return db.collection("users").doc(netid).collection("avatars");
}

export async function countDesigns(
  netid: string,
  db: Firestore = getFirestore()
): Promise<number> {
  const snapshot = await avatarsCollection(netid, db).count().get();
  return snapshot.data().count;
}

export async function listDesigns(
  netid: string,
  db: Firestore = getFirestore()
): Promise<Design[]> {
  const [userSnapshot, versions] = await Promise.all([
    db.collection("users").doc(netid).get(),
    avatarsCollection(netid, db).orderBy("createdAt", "desc").limit(MAX_LISTED_DESIGNS).get()
  ]);
  const currentVersion = userSnapshot.exists
    ? Number(userSnapshot.get("avatarVersion") ?? 0) || null
    : null;

  const raw: RawDesign[] = versions.docs.map((doc) => ({
    version: Number(doc.id),
    name: doc.get("name"),
    config: doc.get("config"),
    pngUrl: doc.get("pngUrl"),
    backgroundUrl: doc.get("backgroundUrl"),
    createdAt: doc.get("createdAt")?.toDate?.().toISOString() ?? null
  }));

  return displayDesigns(raw, currentVersion);
}

export async function getDesign(
  netid: string,
  version: number,
  db: Firestore = getFirestore()
): Promise<{ version: number; name: string; config: unknown } | null> {
  const snapshot = await avatarsCollection(netid, db).doc(String(version)).get();
  if (!snapshot.exists) return null;

  const config: unknown = snapshot.get("config");
  if (typeof config !== "object" || config === null) return null;
  if (typeof snapshot.get("pngUrl") !== "string") return null;

  return {
    version,
    name: validateDesignName(snapshot.get("name")) ?? `Untitled ${version}`,
    config
  };
}

export async function renameDesign(
  netid: string,
  version: number,
  name: string,
  db: Firestore = getFirestore()
): Promise<"ok" | "not_found"> {
  try {
    // update(), never set(..., { merge: true }): a removed design must not be recreated.
    await avatarsCollection(netid, db).doc(String(version)).update({ name });
    return "ok";
  } catch (error) {
    // gRPC NOT_FOUND
    if ((error as { code?: unknown } | null)?.code === 5) return "not_found";
    throw error;
  }
}

export async function deleteDesign(
  netid: string,
  version: number,
  db: Firestore = getFirestore(),
  mark: typeof markAvatarAssetsForDeletion = markAvatarAssetsForDeletion
): Promise<"ok" | "not_found" | "current"> {
  const userRef = db.collection("users").doc(netid);
  const versionRef = userRef.collection("avatars").doc(String(version));

  const result = await db.runTransaction(async (transaction) => {
    // Also covers a version that was reserved but never committed.
    const versionSnapshot = await transaction.get(versionRef);
    if (!versionSnapshot.exists) return "not_found" as const;

    const userSnapshot = await transaction.get(userRef);
    const currentVersion = userSnapshot.exists
      ? Number(userSnapshot.get("avatarVersion") ?? 0)
      : 0;
    if (currentVersion === version) return "current" as const;

    transaction.delete(versionRef);
    return "ok" as const;
  });

  if (result === "ok") {
    let avatarId: string | undefined;
    try {
      avatarId = getAvatarId(netid);
      await mark(avatarId, version);
    } catch (error) {
      // The files just stay, which is harmless.
      console.error({ event: "asset_mark_failed", avatarId, version, error });
    }
  }

  return result;
}

export async function getCurrentAvatar(
  netid: string,
  db: Firestore = getFirestore()
): Promise<CurrentAvatar | null> {
  return avatarFromSnapshot(await db.collection("users").doc(netid).get());
}

/** Reads many users' current avatars in one Firestore round trip. */
export async function getCurrentAvatars(
  netids: string[],
  db: Firestore = getFirestore()
): Promise<Map<string, CurrentAvatar | null>> {
  const result = new Map<string, CurrentAvatar | null>();
  if (netids.length === 0) return result;

  const refs = netids.map((netid) => db.collection("users").doc(netid));
  const snapshots = await db.getAll(...refs);
  snapshots.forEach((snapshot, index) => {
    result.set(netids[index], avatarFromSnapshot(snapshot));
  });
  return result;
}

function avatarFromSnapshot(snapshot: {
  exists: boolean;
  get(field: string): unknown;
}): CurrentAvatar | null {
  if (!snapshot.exists) return null;

  const version = Number(snapshot.get("avatarVersion") ?? 0);
  const pngUrl = snapshot.get("pngUrl");
  const svgUrl = snapshot.get("svgUrl");
  const backgroundUrl = snapshot.get("backgroundUrl");

  if (
    !version ||
    typeof pngUrl !== "string" ||
    typeof svgUrl !== "string" ||
    typeof backgroundUrl !== "string"
  ) {
    return null;
  }

  return { version, pngUrl, svgUrl, backgroundUrl };
}
