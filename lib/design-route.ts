import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checkDesignEditRateLimit } from "@/lib/avatar-store";
import { parseDesignVersion } from "@/lib/designs";

// Shared by the /api/designs/[version] routes. Route files may only export
// handlers, so this lives here.
export type RouteContext = { params: Promise<{ version: string }> };

// Auth, then version, then rate limit, for every method. The netid only
// ever comes from the session.
export async function authorize(
  ctx: RouteContext
): Promise<{ netid: string; version: number } | { response: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) {
    return { response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) };
  }

  const version = parseDesignVersion((await ctx.params).version);
  if (version === null) {
    return { response: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  }

  const response = await designEditRateLimitResponse(user.netid);
  if (response) return { response };
  return { netid: user.netid, version };
}

export async function designEditRateLimitResponse(netid: string): Promise<NextResponse | null> {
  let rateLimit: Awaited<ReturnType<typeof checkDesignEditRateLimit>>;
  try {
    rateLimit = await checkDesignEditRateLimit(netid);
  } catch (error) {
    // A Firestore failure here would otherwise escape as an unshaped 500.
    console.error("Design edit rate limit failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSeconds: rateLimit.retryAfterSeconds },
      { status: 429 }
    );
  }

  return null;
}
