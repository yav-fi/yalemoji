import { NextRequest, NextResponse } from "next/server";
import { makeDesignCurrent } from "@/lib/avatar-store";
import { authorize, type RouteContext } from "@/lib/design-route";

export const runtime = "nodejs";

// Makes a saved design the user's live avatar.
export async function POST(_request: NextRequest, ctx: RouteContext) {
  const auth = await authorize(ctx);
  if ("response" in auth) return auth.response;

  try {
    const result = await makeDesignCurrent(auth.netid, auth.version);
    if (result === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ version: auth.version }, { status: 200 });
  } catch (error) {
    console.error("Making a design current failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
