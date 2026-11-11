import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { missingRequiredFeatures, validateAvatarConfig } from "@/lib/avatar-config";
import { renderAvatarAssets } from "@/lib/avatar-render";
import { uploadAvatarAssets } from "@/lib/avatar-storage";
import {
  checkAvatarSaveRateLimit,
  commitAvatarVersion,
  countDesigns,
  getAvatarId,
  reserveNextVersion
} from "@/lib/avatar-store";
import { defaultDesignName } from "@/lib/designs";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const rateLimit = await checkAvatarSaveRateLimit(user.netid);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSeconds: rateLimit.retryAfterSeconds },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_config" }, { status: 400 });
  }

  const setAsCurrent = (body as { setAsCurrent?: unknown } | null)?.setAsCurrent;
  if (setAsCurrent !== undefined && typeof setAsCurrent !== "boolean") {
    return NextResponse.json({ error: "invalid_config" }, { status: 400 });
  }
  const config = validateAvatarConfig(body);
  if (!config) {
    return NextResponse.json({ error: "invalid_config" }, { status: 400 });
  }

  const missing = missingRequiredFeatures(config);
  if (missing.length > 0) {
    return NextResponse.json({ error: "incomplete_avatar", missing }, { status: 400 });
  }

  try {
    const avatarId = getAvatarId(user.netid);
    const name = defaultDesignName(
      await countDesigns(user.netid).catch((error) => {
        console.error("Design count failed", error);
        return null;
      })
    );
    const version = await reserveNextVersion(user.netid);
    const { svg, png, backgroundSvg } = await renderAvatarAssets(config);
    const { svgUrl, pngUrl, backgroundUrl } = await uploadAvatarAssets(
      avatarId,
      version,
      svg,
      png,
      backgroundSvg
    );

    await commitAvatarVersion(user.netid, version, {
      avatarId,
      setAsCurrent: setAsCurrent !== false,
      config,
      pngUrl,
      svgUrl,
      backgroundUrl,
      name
    });

    return NextResponse.json({ version, pngUrl, svgUrl, backgroundUrl }, { status: 200 });
  } catch (error) {
    console.error("Avatar save failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
