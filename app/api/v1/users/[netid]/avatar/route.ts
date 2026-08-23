import { NextRequest, NextResponse } from "next/server";
import { isValidNetid } from "@/lib/auth";
import { checkAvatarReadRateLimit, getCurrentAvatar } from "@/lib/avatar-store";
import { hashValue } from "@/lib/hash";
import { getRequestIp } from "@/lib/request-ip";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ netid: string }> }
) {
  const { netid } = await params;
  if (!isValidNetid(netid)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
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

  const avatar = await getCurrentAvatar(netid);
  if (!avatar) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      version: avatar.version,
      png_url: avatar.pngUrl,
      svg_url: avatar.svgUrl,
      background_url: avatar.backgroundUrl
    },
    { status: 200, headers: { "Cache-Control": "public, max-age=300" } }
  );
}
