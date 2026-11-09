import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_STATE_COOKIE,
  AUTH_STATE_TTL_SECONDS,
  createAuthState,
  getCurrentUser,
  secureCookieOptions
} from "@/lib/auth";
import { getPageContext, LOGIN_CONTEXT_COOKIE, withPageContext } from "@/lib/page-context";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (await getCurrentUser()) {
    return NextResponse.redirect(new URL(withPageContext("/editor", request.nextUrl.searchParams), request.url));
  }

  const state = createAuthState();
  const yaliesBaseUrl = process.env.YALIES_API_URL ?? "https://api.yalies.io";
  let loginUrl: URL;

  try {
    loginUrl = new URL("/v3/login/yalemoji", yaliesBaseUrl);
  } catch {
    return NextResponse.json({ error: "authentication_unavailable" }, { status: 500 });
  }

  loginUrl.searchParams.set("state", state);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.set(
    AUTH_STATE_COOKIE,
    state,
    secureCookieOptions(AUTH_STATE_TTL_SECONDS)
  );
  response.cookies.set(LOGIN_CONTEXT_COOKIE, getPageContext(request.nextUrl.searchParams), secureCookieOptions(AUTH_STATE_TTL_SECONDS));
  return response;
}
