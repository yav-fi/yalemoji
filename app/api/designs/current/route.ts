import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { clearCurrentAvatar } from "@/lib/avatar-store";
import { designEditRateLimitResponse } from "@/lib/design-route";

export const runtime = "nodejs";

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const rateLimitResponse = await designEditRateLimitResponse(user.netid);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await clearCurrentAvatar(user.netid);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Clearing the current avatar failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
