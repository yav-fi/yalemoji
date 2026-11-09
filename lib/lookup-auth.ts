import { NextRequest, NextResponse } from "next/server";
import { readBearerApiKey, verifyApiKey, type ApiKeyClient } from "./api-keys";
import { checkApiKeyReadRateLimit, type CurrentAvatar } from "./avatar-store";

export type LookupAuthResult =
  | { ok: true; client: ApiKeyClient }
  | { ok: false; response: NextResponse };

const ERROR_HEADERS = { "Cache-Control": "no-store" };
const AUTH_HEADERS = { ...ERROR_HEADERS, "WWW-Authenticate": 'Bearer realm="yalemoji"' };

/**
 * Gate for all NetID lookup routes: requires a valid, unrevoked app API key and
 * applies that key's rate limit.
 */
export async function authorizeLookup(request: NextRequest): Promise<LookupAuthResult> {
  const key = readBearerApiKey(request.headers);
  if (!key) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "missing_api_key" },
        { status: 401, headers: AUTH_HEADERS }
      )
    };
  }

  let client: ApiKeyClient | null;
  let rateLimit;
  try {
    client = await verifyApiKey(key);
    if (client) rateLimit = await checkApiKeyReadRateLimit(client.keyId);
  } catch (error) {
    console.error("Lookup authorization failed", error);
    return {
      ok: false,
      response: NextResponse.json({ error: "server_error" }, { status: 503, headers: ERROR_HEADERS })
    };
  }

  if (!client) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "invalid_api_key" },
        { status: 401, headers: AUTH_HEADERS }
      )
    };
  }

  if (rateLimit && !rateLimit.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "rate_limited", retryAfterSeconds: rateLimit.retryAfterSeconds },
        { status: 429, headers: { ...ERROR_HEADERS, "Retry-After": String(rateLimit.retryAfterSeconds) } }
      )
    };
  }

  return { ok: true, client };
}

/** The public JSON shape of an avatar, shared by every lookup route. */
export function serializeAvatar(avatar: CurrentAvatar) {
  return {
    version: avatar.version,
    png_url: avatar.pngUrl,
    svg_url: avatar.svgUrl,
    background_url: avatar.backgroundUrl
  };
}

// Responses depend on the caller's key, so shared caches must not store them.
export const LOOKUP_CACHE_HEADERS = { "Cache-Control": "private, max-age=300" };
