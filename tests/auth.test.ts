import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  SESSION_TTL_SECONDS,
  verifySessionToken,
  verifyYaliesAssertion
} from "@/lib/auth";

const authSecret = "auth-secret-that-is-at-least-thirty-two-bytes";
const sessionSecret = "session-secret-that-is-at-least-thirty-two-bytes";
const now = 1_800_000_000;
const state = "known-random-state";

function sign(payload: object, secret = authSecret) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

function assertion(overrides: Record<string, unknown> = {}) {
  return sign({
    v: 1,
    iss: "yalies",
    aud: "yalemoji",
    netid: "abc123",
    iat: now - 10,
    exp: now + 50,
    state,
    ...overrides
  });
}

describe("Yalies assertion verification", () => {
  it("accepts a valid assertion", () => {
    expect(verifyYaliesAssertion(assertion(), authSecret, state, now)).toEqual({
      netid: "abc123"
    });
  });

  it("rejects the wrong secret", () => {
    expect(verifyYaliesAssertion(assertion(), "wrong", state, now)).toBeNull();
  });

  it("rejects a changed NetID", () => {
    const token = assertion();
    const [encoded, signature] = token.split(".");
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
    payload.netid = "attacker";
    const changed = `${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${signature}`;
    expect(verifyYaliesAssertion(changed, authSecret, state, now)).toBeNull();
  });

  it.each([
    ["changed state", assertion(), "other-state"],
    ["missing state", assertion(), undefined],
    ["invalid audience", assertion({ aud: "other" }), state],
    ["invalid issuer", assertion({ iss: "other" }), state],
    ["expired assertion", assertion({ exp: now }), state],
    ["wrong version", assertion({ v: 2 }), state]
  ])("rejects %s", (_name, token, expectedState) => {
    expect(
      verifyYaliesAssertion(token, authSecret, expectedState, now)
    ).toBeNull();
  });

  it.each(["not-a-token", "a.b.c", "%%%.abc", "abc.%%%"])(
    "rejects malformed assertion %s",
    (token) => {
      expect(verifyYaliesAssertion(token, authSecret, state, now)).toBeNull();
    }
  );

  it("rejects a bad signature", () => {
    const token = assertion();
    const [encoded, signature] = token.split(".");
    const changedSignature = `${signature[0] === "a" ? "b" : "a"}${signature.slice(1)}`;
    expect(
      verifyYaliesAssertion(`${encoded}.${changedSignature}`, authSecret, state, now)
    ).toBeNull();
  });
});

describe("YaleMoji sessions", () => {
  it("round-trips a valid session", () => {
    const token = createSessionToken("abc123", sessionSecret, now);
    expect(verifySessionToken(token, sessionSecret, now + 1)).toEqual({
      netid: "abc123"
    });
  });

  it("rejects a changed payload", () => {
    const token = createSessionToken("abc123", sessionSecret, now);
    const [encoded, signature] = token.split(".");
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
    payload.netid = "attacker";
    const changed = `${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${signature}`;
    expect(verifySessionToken(changed, sessionSecret, now + 1)).toBeNull();
  });

  it("rejects an expired session", () => {
    const token = createSessionToken("abc123", sessionSecret, now);
    expect(
      verifySessionToken(token, sessionSecret, now + SESSION_TTL_SECONDS)
    ).toBeNull();
  });

  it.each(["not-a-token", "a.b.c", "%%%.abc"])(
    "rejects malformed session %s",
    (token) => {
      expect(verifySessionToken(token, sessionSecret, now)).toBeNull();
    }
  );
});
