import type { Firestore } from "@google-cloud/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearApiKeyCache,
  generateApiKey,
  hashApiKey,
  readBearerApiKey,
  verifyApiKey
} from "@/lib/api-keys";

function fakeDb(docs: Record<string, Record<string, unknown>>) {
  const get = vi.fn(async (id: string) => ({
    exists: id in docs,
    get: (field: string) => docs[id]?.[field]
  }));
  const db = {
    collection: () => ({ doc: (id: string) => ({ get: () => get(id) }) })
  } as unknown as Firestore;
  return { db, get };
}

describe("api keys", () => {
  beforeEach(() => clearApiKeyCache());

  it("generates well-formed keys that the bearer parser accepts", () => {
    const key = generateApiKey();
    expect(key).toMatch(/^ymk_[A-Za-z0-9_-]{43}$/);
    expect(readBearerApiKey(new Headers({ authorization: `Bearer ${key}` }))).toBe(key);
  });

  it("rejects missing or malformed Authorization headers", () => {
    expect(readBearerApiKey(new Headers())).toBeNull();
    expect(readBearerApiKey(new Headers({ authorization: "Bearer nope" }))).toBeNull();
    expect(readBearerApiKey(new Headers({ authorization: generateApiKey() }))).toBeNull();
  });

  it("accepts an active key and returns its app", async () => {
    const key = generateApiKey();
    const { db } = fakeDb({ [hashApiKey(key)]: { app: "coursetable", revokedAt: null } });
    expect(await verifyApiKey(key, 0, db)).toEqual({ keyId: hashApiKey(key), app: "coursetable" });
  });

  it("rejects unknown and revoked keys", async () => {
    const revoked = generateApiKey();
    const { db } = fakeDb({ [hashApiKey(revoked)]: { app: "x", revokedAt: new Date() } });
    expect(await verifyApiKey(revoked, 0, db)).toBeNull();
    expect(await verifyApiKey(generateApiKey(), 0, db)).toBeNull();
  });

  it("caches lookups for a minute so revocation lands within the TTL", async () => {
    const key = generateApiKey();
    const docs: Record<string, Record<string, unknown>> = {
      [hashApiKey(key)]: { app: "yalies", revokedAt: null }
    };
    const { db, get } = fakeDb(docs);

    expect(await verifyApiKey(key, 0, db)).not.toBeNull();
    docs[hashApiKey(key)].revokedAt = new Date();
    expect(await verifyApiKey(key, 30_000, db)).not.toBeNull();
    expect(get).toHaveBeenCalledTimes(1);
    expect(await verifyApiKey(key, 61_000, db)).toBeNull();
  });
});
