import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, expect, it, vi } from "vitest";
import { AUTH_STATE_COOKIE } from "@/lib/auth";
import { LOGIN_CONTEXT_COOKIE } from "@/lib/page-context";
import { GET as login } from "@/app/api/auth/login/route";
import { GET as callback } from "@/app/api/auth/callback/route";

vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  getCurrentUser: vi.fn(async () => null)
}));
vi.mock("@/lib/avatar-store", () => ({ recordLogin: vi.fn(async () => {}) }));

afterEach(() => vi.unstubAllEnvs());

it("carries a normalized ref and URL theme through a successful login", async () => {
  vi.stubEnv("YALEMOJI_AUTH_SECRET", "auth-context-test-secret");
  vi.stubEnv("YALEMOJI_SESSION_SECRET", "session-context-test-secret");
  const start = await login(new NextRequest("https://yalemoji.com/api/auth/login?ref=Yale+Menus&mode=dark"));
  const state = start.cookies.get(AUTH_STATE_COOKIE)!.value;
  const context = start.cookies.get(LOGIN_CONTEXT_COOKIE)!.value;
  expect(context).toBe("ref=yalemeals&mode=dark");

  const now = Math.floor(Date.now() / 1000);
  const encoded = Buffer.from(JSON.stringify({ v: 1, iss: "yalies", aud: "yalemoji", netid: "abc123", state, iat: now, exp: now + 60 })).toString("base64url");
  const signature = createHmac("sha256", "auth-context-test-secret").update(encoded).digest("base64url");
  const request = new NextRequest(`https://yalemoji.com/api/auth/callback?assertion=${encoded}.${signature}`);
  request.cookies.set(AUTH_STATE_COOKIE, state);
  request.cookies.set(LOGIN_CONTEXT_COOKIE, context);
  const response = await callback(request);
  expect(response.headers.get("location")).toBe("https://yalemoji.com/editor?ref=yalemeals&mode=dark");
  expect(response.cookies.get(LOGIN_CONTEXT_COOKIE)?.value).toBe("");
});
