import { createHash, randomBytes } from "node:crypto";
import type { Firestore } from "@google-cloud/firestore";
import { getFirestore } from "./firestore-store";

/**
 * API keys for other Yale apps (Yalies, CourseTable, ...) that read avatars.
 *
 * Keys are issued per app with `npm run api-keys -- create`. Only the SHA-256
 * hash of a key is stored, at `apiKeys/{hash}`, so a Firestore leak doesn't
 * leak usable keys. Revoking a key sets `revokedAt`; the in-memory cache below
 * means a revoked key stops working within KEY_CACHE_TTL_MS.
 */

export const API_KEY_PREFIX = "ymk_";
export const API_KEYS_COLLECTION = "apiKeys";
const API_KEY_PATTERN = /^ymk_[A-Za-z0-9_-]{43}$/;
const KEY_CACHE_TTL_MS = 60 * 1000;
const KEY_CACHE_MAX_ENTRIES = 1000;

export type ApiKeyClient = { keyId: string; app: string };

type CacheEntry = { client: ApiKeyClient | null; expiresAt: number };
const keyCache = new Map<string, CacheEntry>();

export function generateApiKey(): string {
  return `${API_KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function isWellFormedApiKey(value: unknown): value is string {
  return typeof value === "string" && API_KEY_PATTERN.test(value);
}

/** Reads `Authorization: Bearer <key>`; returns null if absent or malformed. */
export function readBearerApiKey(headers: Headers): string | null {
  const header = headers.get("authorization");
  if (!header) return null;

  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  const key = match?.[1];
  return isWellFormedApiKey(key) ? key : null;
}

export async function verifyApiKey(
  key: string,
  nowMs = Date.now(),
  db: Firestore = getFirestore()
): Promise<ApiKeyClient | null> {
  if (!isWellFormedApiKey(key)) return null;

  const keyId = hashApiKey(key);
  const cached = keyCache.get(keyId);
  if (cached && cached.expiresAt > nowMs) return cached.client;

  const snapshot = await db.collection(API_KEYS_COLLECTION).doc(keyId).get();
  const app = snapshot.exists ? snapshot.get("app") : null;
  const revoked = snapshot.exists && snapshot.get("revokedAt") != null;
  const client = typeof app === "string" && app && !revoked ? { keyId, app } : null;

  if (keyCache.size >= KEY_CACHE_MAX_ENTRIES) keyCache.clear();
  keyCache.set(keyId, { client, expiresAt: nowMs + KEY_CACHE_TTL_MS });
  return client;
}

/** Test-only: forget cached key lookups. */
export function clearApiKeyCache() {
  keyCache.clear();
}
