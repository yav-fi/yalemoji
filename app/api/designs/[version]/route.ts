import { NextRequest, NextResponse } from "next/server";
import { deleteDesign, renameDesign } from "@/lib/avatar-store";
import { authorize, type RouteContext } from "@/lib/design-route";
import { validateDesignName } from "@/lib/designs";

export const runtime = "nodejs";

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
