import { NextRequest, NextResponse } from "next/server";
import { createFirestorePageViewStore } from "@/lib/firestore-store";
import { handlePageViewRequest } from "@/lib/page-view-api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const salt = process.env.RATE_LIMIT_SALT;
  let result: Awaited<ReturnType<typeof handlePageViewRequest>>;

  try {
    result = await handlePageViewRequest(request, {
      salt,
      store: salt ? createFirestorePageViewStore() : undefined
    });
  } catch (error) {
    console.error("Page-view route failed before handler", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json(result.body, { status: result.status });
}
