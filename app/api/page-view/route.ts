import { NextRequest, NextResponse } from "next/server";
import { createFirestorePageViewStore } from "@/lib/firestore-store";
import { handlePageViewRequest } from "@/lib/page-view-api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const salt = process.env.RATE_LIMIT_SALT;
  const result = await handlePageViewRequest(request, {
    salt,
    store: salt ? createFirestorePageViewStore() : undefined
  });

  return NextResponse.json(result.body, { status: result.status });
}
