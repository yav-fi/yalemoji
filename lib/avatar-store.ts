import { FieldValue, Firestore } from "@google-cloud/firestore";
import { getFirestore } from "./firestore-store";
import { hashValue } from "./hash";
import { decideRateLimit } from "./rate-limit";
import type { AvatarConfig } from "./avatar-config";

const AVATAR_SAVE_LIMIT = 20;
const AVATAR_SAVE_WINDOW_MS = 60 * 60 * 1000;
const AVATAR_READ_LIMIT = 300;
const AVATAR_READ_WINDOW_MS = 60 * 1000;

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

export async function getCurrentAvatar(
  netid: string,
  db: Firestore = getFirestore()
): Promise<CurrentAvatar | null> {
  const snapshot = await db.collection("users").doc(netid).get();
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
