import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const AUTH_STATE_COOKIE = "yalemoji_auth_state";
export const SESSION_COOKIE = "yalemoji_session";
export const AUTH_STATE_TTL_SECONDS = 10 * 60;
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

const ASSERTION_CLOCK_SKEW_SECONDS = 60;
const ASSERTION_MAX_AGE_SECONDS = 5 * 60;
const NETID_PATTERN = /^[a-z][a-z0-9]{1,7}$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

type YaliesAssertionPayload = {
  v: 1;
  iss: "yalies";
  aud: "yalemoji";
  netid: string;
  iat: number;
  exp: number;
  state: string;
};

type SessionPayload = {
  v: 1;
  netid: string;
  iat: number;
  exp: number;
};

export type CurrentUser = { netid: string };

function nowInSeconds() {
  return Math.floor(Date.now() / 1000);
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

export function isValidNetid(value: unknown): value is string {
  return typeof value === "string" && NETID_PATTERN.test(value);
}

function decodeBase64Url(value: string): Buffer | null {
  if (
    !value ||
    !BASE64URL_PATTERN.test(value) ||
    value.length % 4 === 1
  ) {
    return null;
  }

  try {
    const decoded = Buffer.from(value, "base64url");
    return decoded.toString("base64url") === value ? decoded : null;
  } catch {
    return null;
  }
}

function sign(encodedPayload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(encodedPayload).digest();
}

function createSignedToken(payload: object, secret: string): string {
  if (!secret) throw new Error("A signing secret is required");

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload, secret).toString("base64url")}`;
}

function readVerifiedPayload(token: string, secret: string): unknown | null {
  if (!secret || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encodedPayload, encodedSignature] = parts;
  const payload = decodeBase64Url(encodedPayload);
  const receivedSignature = decodeBase64Url(encodedSignature);
  if (!payload || !receivedSignature) return null;

  const expectedSignature = sign(encodedPayload, secret);
  if (
    receivedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(receivedSignature, expectedSignature)
  ) {
    return null;
  }

  try {
    return JSON.parse(payload.toString("utf8")) as unknown;
  } catch {
    return null;
  }
}

function statesMatch(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return (
    actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes)
  );
}

export function createAuthState(): string {
  return randomBytes(32).toString("base64url");
}

export function verifyYaliesAssertion(
  assertion: string,
  secret: string,
  expectedState: string | undefined,
  now = nowInSeconds()
): CurrentUser | null {
  if (!expectedState) return null;

  const payload = readVerifiedPayload(assertion, secret);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;

  const candidate = payload as Partial<YaliesAssertionPayload>;
  if (
    candidate.v !== 1 ||
    candidate.iss !== "yalies" ||
    candidate.aud !== "yalemoji" ||
    !isValidNetid(candidate.netid) ||
    !isInteger(candidate.iat) ||
    !isInteger(candidate.exp) ||
    typeof candidate.state !== "string" ||
    !statesMatch(candidate.state, expectedState) ||
    candidate.iat > now + ASSERTION_CLOCK_SKEW_SECONDS ||
    candidate.iat < now - ASSERTION_MAX_AGE_SECONDS ||
    candidate.exp <= now ||
    candidate.exp <= candidate.iat ||
    candidate.exp > candidate.iat + ASSERTION_MAX_AGE_SECONDS
  ) {
    return null;
  }

  return { netid: candidate.netid };
}

export function createSessionToken(
  netid: string,
  secret: string,
  now = nowInSeconds()
): string {
  if (!isValidNetid(netid)) throw new Error("Invalid NetID");

  return createSignedToken(
    { v: 1, netid, iat: now, exp: now + SESSION_TTL_SECONDS } satisfies SessionPayload,
    secret
  );
}

export function verifySessionToken(
  token: string,
  secret: string,
  now = nowInSeconds()
): CurrentUser | null {
  const payload = readVerifiedPayload(token, secret);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;

  const candidate = payload as Partial<SessionPayload>;
  if (
    candidate.v !== 1 ||
    !isValidNetid(candidate.netid) ||
    !isInteger(candidate.iat) ||
    !isInteger(candidate.exp) ||
    candidate.iat > now + ASSERTION_CLOCK_SKEW_SECONDS ||
    candidate.exp <= now ||
    candidate.exp <= candidate.iat ||
    candidate.exp > candidate.iat + SESSION_TTL_SECONDS
  ) {
    return null;
  }

  return { netid: candidate.netid };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const secret = process.env.YALEMOJI_SESSION_SECRET;
  if (!secret) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token, secret) : null;
}

export function secureCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge
  };
}
