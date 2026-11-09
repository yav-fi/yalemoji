import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_STATE_COOKIE,
  createSessionToken,
  secureCookieOptions,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  verifyYaliesAssertion
} from "@/lib/auth";
import { recordLogin } from "@/lib/avatar-store";

export const runtime = "nodejs";

function clearState(response: NextResponse) {
  response.cookies.set(AUTH_STATE_COOKIE, "", secureCookieOptions(0));
  return response;
}

export async function GET(request: NextRequest) {
  const authSecret = process.env.YALEMOJI_AUTH_SECRET;
  const sessionSecret = process.env.YALEMOJI_SESSION_SECRET;
  if (!authSecret || !sessionSecret) {
    return clearState(
      NextResponse.json({ error: "authentication_unavailable" }, { status: 500 })
    );
  }

  const assertion = request.nextUrl.searchParams.get("assertion");
  const expectedState = request.cookies.get(AUTH_STATE_COOKIE)?.value;
  const user = assertion
    ? verifyYaliesAssertion(assertion, authSecret, expectedState)
    : null;

  if (!user) {
    return clearState(
      NextResponse.json({ error: "authentication_failed" }, { status: 401 })
    );
  }

  try {
    await recordLogin(user.netid);
  } catch (error) {
    console.error("Failed to record login", error);
  }

  const response = clearState(
    NextResponse.redirect(new URL("/editor", request.url))
  );
  response.cookies.set(
    SESSION_COOKIE,
    createSessionToken(user.netid, sessionSecret, undefined, user.firstName),
    secureCookieOptions(SESSION_TTL_SECONDS)
  );
  return response;
}
