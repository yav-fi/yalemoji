import { NextRequest, NextResponse } from "next/server";
import { secureCookieOptions, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(SESSION_COOKIE, "", secureCookieOptions(0));
  return response;
}
