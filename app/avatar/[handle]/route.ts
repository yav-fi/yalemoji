import { NextRequest, NextResponse } from "next/server";
import { checkAvatarReadRateLimit, getCurrentAvatar } from "@/lib/avatar-store";
import { parseHandle } from "@/lib/avatar-handle";
import { hashValue } from "@/lib/hash";
import { getRequestIp } from "@/lib/request-ip";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  const parsed = parseHandle(handle);
  if (!parsed) {
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

  const avatar = await getCurrentAvatar(parsed.netid);
  if (!avatar) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const target = parsed.ext === "svg" ? avatar.svgUrl : avatar.pngUrl;
  return NextResponse.redirect(target, { status: 302 });
}
