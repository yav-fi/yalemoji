import { NextRequest, NextResponse } from "next/server";
import { createFirestoreWaitlistStore } from "@/lib/firestore-store";
import { handleWaitlistRequest } from "@/lib/waitlist-api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const salt = process.env.RATE_LIMIT_SALT;
  const result = await handleWaitlistRequest(request, {
    salt,
    store: salt ? createFirestoreWaitlistStore({ salt }) : undefined
  });

  return NextResponse.json(result.body, { status: result.status });
}
