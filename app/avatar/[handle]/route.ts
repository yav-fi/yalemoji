import { NextRequest, NextResponse } from "next/server";
import { getCurrentAvatar } from "@/lib/avatar-store";
import { parseHandle } from "@/lib/avatar-handle";
import { authorizeLookup, LOOKUP_CACHE_HEADERS } from "@/lib/lookup-auth";

export const runtime = "nodejs";

const ERROR_HEADERS = { "Cache-Control": "no-store" };

// Short, private cache so a newly created avatar shows up soon.
function defaultAvatarRedirect(request: NextRequest, ext: "svg" | "png") {
  const target = new URL(`/assets/default-avatar.${ext}`, request.nextUrl.origin);
  return NextResponse.redirect(target, { status: 302, headers: LOOKUP_CACHE_HEADERS });
}

/**
 * API-key-protected redirect for app servers. Browsers should display the
 * opaque asset URLs returned by the JSON lookup APIs instead of this route.
 * A missing avatar gets a default image; infrastructure failures stay errors.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  const auth = await authorizeLookup(request);
  if (!auth.ok) return auth.response;

  const { handle } = await params;
  const ext = handle.slice(handle.lastIndexOf(".") + 1);
  if (ext !== "svg" && ext !== "png") {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: ERROR_HEADERS });
  }

  const parsed = parseHandle(handle.toLowerCase());
  if (!parsed) {
    return defaultAvatarRedirect(request, ext);
  }

  let avatar;
  try {
    avatar = await getCurrentAvatar(parsed.netid);
  } catch (error) {
    console.error("Avatar lookup failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 503, headers: ERROR_HEADERS });
  }

  if (!avatar) {
    return defaultAvatarRedirect(request, ext);
  }

  const target = parsed.ext === "svg" ? avatar.svgUrl : avatar.pngUrl;
  return NextResponse.redirect(target, { status: 302, headers: LOOKUP_CACHE_HEADERS });
}
