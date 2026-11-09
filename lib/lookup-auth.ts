import { NextRequest, NextResponse } from "next/server";
import { readBearerApiKey, verifyApiKey, type ApiKeyClient } from "./api-keys";
import { checkApiKeyReadRateLimit, type CurrentAvatar } from "./avatar-store";

export type LookupAuthResult =
  | { ok: true; client: ApiKeyClient }
  | { ok: false; response: NextResponse };

const AUTH_HEADERS = { "WWW-Authenticate": 'Bearer realm="yalemoji"' };

/**
 * Gate for the JSON lookup APIs: requires a valid, unrevoked app API key and
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
  try {
    client = await verifyApiKey(key);
  } catch (error) {
    console.error("API key verification failed", error);
    return {
      ok: false,
      response: NextResponse.json({ error: "server_error" }, { status: 500 })
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

  const rateLimit = await checkApiKeyReadRateLimit(client.keyId);
  if (!rateLimit.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "rate_limited", retryAfterSeconds: rateLimit.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
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
