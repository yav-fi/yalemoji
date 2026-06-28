import { NextRequest, NextResponse } from "next/server";
import { createFirestoreWaitlistStore } from "@/lib/firestore-store";
import { handleWaitlistRequest } from "@/lib/waitlist-api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const salt = process.env.RATE_LIMIT_SALT;
  let result: Awaited<ReturnType<typeof handleWaitlistRequest>>;

  try {
    result = await handleWaitlistRequest(request, {
      salt,
      store: salt ? createFirestoreWaitlistStore({ salt }) : undefined
    });
  } catch (error) {
    console.error("Waitlist route failed before handler", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json(result.body, { status: result.status });
}
