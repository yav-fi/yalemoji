import { NextRequest, NextResponse } from "next/server";
import { checkAvatarReadRateLimit, getCurrentAvatar } from "@/lib/avatar-store";
import { parseHandle } from "@/lib/avatar-handle";
import { hashValue } from "@/lib/hash";
import { getRequestIp } from "@/lib/request-ip";

export const runtime = "nodejs";

// Short cache on the default so a newly created avatar shows up soon.
const DEFAULT_CACHE_HEADERS = { "Cache-Control": "public, max-age=300" };

function defaultAvatarRedirect(request: NextRequest, ext: "svg" | "png") {
  const target = new URL(`/assets/default-avatar.${ext}`, request.nextUrl.origin);
  return NextResponse.redirect(target, { status: 302, headers: DEFAULT_CACHE_HEADERS });
}

/**
 * `<img src="/avatar/{netid}.png">` (or `.svg`) for any Yale app. Redirects to
 * the user's current avatar, or to a default image if they haven't made one,
 * so the image never breaks. Only an unsupported extension gets a 404.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  const ext = handle.slice(handle.lastIndexOf(".") + 1);
  if (ext !== "svg" && ext !== "png") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const parsed = parseHandle(handle.toLowerCase());
  if (!parsed) {
    return defaultAvatarRedirect(request, ext);
  }

  const salt = process.env.RATE_LIMIT_SALT;
  if (salt) {
    const ipHash = hashValue(getRequestIp(request.headers), salt);
    const rateLimit = await checkAvatarReadRateLimit(ipHash);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "rate_limited", retryAfterSeconds: rateLimit.retryAfterSeconds },
        { status: 429 }
      );
    }
  }

  let avatar;
  try {
    avatar = await getCurrentAvatar(parsed.netid);
  } catch (error) {
    console.error("Avatar lookup failed; serving default", error);
    return defaultAvatarRedirect(request, ext);
  }

  if (!avatar) {
    return defaultAvatarRedirect(request, ext);
  }

  const target = parsed.ext === "svg" ? avatar.svgUrl : avatar.pngUrl;
  return NextResponse.redirect(target, { status: 302 });
}
