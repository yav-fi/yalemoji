import { NextRequest, NextResponse } from "next/server";
import { isValidNetid } from "@/lib/auth";
import { getCurrentAvatar } from "@/lib/avatar-store";
import { authorizeLookup, LOOKUP_CACHE_HEADERS, serializeAvatar } from "@/lib/lookup-auth";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ netid: string }> }
) {
  const auth = await authorizeLookup(request);
  if (!auth.ok) return auth.response;

  const netid = (await params).netid.trim().toLowerCase();
  if (!isValidNetid(netid)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const avatar = await getCurrentAvatar(netid);
  if (!avatar) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(
    { netid, avatar: serializeAvatar(avatar) },
    { status: 200, headers: LOOKUP_CACHE_HEADERS }
  );
}
