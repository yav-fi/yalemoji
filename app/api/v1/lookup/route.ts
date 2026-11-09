import { NextRequest, NextResponse } from "next/server";
import { isValidNetid } from "@/lib/auth";
import { getCurrentAvatars, MAX_BATCH_LOOKUP } from "@/lib/avatar-store";
import { authorizeLookup, LOOKUP_CACHE_HEADERS, serializeAvatar } from "@/lib/lookup-auth";

export const runtime = "nodejs";

/**
 * Batch avatar lookup: POST { "netids": ["abc123", "xyz9"] }
 * -> { "users": { "abc123": { version, png_url, ... }, "xyz9": null } }
 *
 * Every requested NetID (lowercased) appears in `users`; null means no avatar
 * or not a valid NetID. At most MAX_BATCH_LOOKUP NetIDs per request.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeLookup(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const raw = (body as { netids?: unknown } | null)?.netids;
  if (!Array.isArray(raw) || raw.some((value) => typeof value !== "string")) {
    return NextResponse.json(
      { error: "invalid_body", message: "Expected { netids: string[] }" },
      { status: 400 }
    );
  }

  const requested = [...new Set((raw as string[]).map((netid) => netid.trim().toLowerCase()))];
  if (requested.length > MAX_BATCH_LOOKUP) {
    return NextResponse.json(
      { error: "too_many_netids", max: MAX_BATCH_LOOKUP },
      { status: 400 }
    );
  }

  const valid = requested.filter((netid) => isValidNetid(netid));
  let avatars;
  try {
    avatars = await getCurrentAvatars(valid);
  } catch (error) {
    console.error("Batch avatar lookup failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const users: Record<string, ReturnType<typeof serializeAvatar> | null> = {};
  for (const netid of requested) {
    const avatar = avatars.get(netid);
    users[netid] = avatar ? serializeAvatar(avatar) : null;
  }

  return NextResponse.json({ users }, { status: 200, headers: LOOKUP_CACHE_HEADERS });
}
