import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checkDesignEditRateLimit, deleteDesign, renameDesign } from "@/lib/avatar-store";
import { parseDesignVersion, validateDesignName } from "@/lib/designs";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ version: string }> };

// Shared by both methods: auth, then version, then rate limit. The netid only
// ever comes from the session.
async function authorize(
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

  let rateLimit: Awaited<ReturnType<typeof checkDesignEditRateLimit>>;
  try {
    rateLimit = await checkDesignEditRateLimit(user.netid);
  } catch (error) {
    // A Firestore failure here would otherwise escape as an unshaped 500.
    console.error("Design edit rate limit failed", error);
    return { response: NextResponse.json({ error: "server_error" }, { status: 500 }) };
  }
  if (!rateLimit.allowed) {
    return {
      response: NextResponse.json(
        { error: "rate_limited", retryAfterSeconds: rateLimit.retryAfterSeconds },
        { status: 429 }
      )
    };
  }

  return { netid: user.netid, version };
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  const auth = await authorize(ctx);
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }

  const name = validateDesignName((body as { name?: unknown } | null)?.name);
  if (name === null) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }

  try {
    const result = await renameDesign(auth.netid, auth.version, name);
    if (result === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ name }, { status: 200 });
  } catch (error) {
    console.error("Design rename failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext) {
  const auth = await authorize(ctx);
  if ("response" in auth) return auth.response;

  try {
    const result = await deleteDesign(auth.netid, auth.version);
    if (result === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (result === "current") {
      return NextResponse.json({ error: "current_design" }, { status: 409 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Design removal failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
