import { hashValue } from "./hash";
import { submitWaitlist, type WaitlistStore } from "./waitlist-service";

type JsonRequest = {
  headers: Headers;
  json(): Promise<unknown>;
};

export type WaitlistApiResult =
  | { status: 200; body: { ok: true } }
  | { status: 400; body: { error: "invalid_email" } }
  | { status: 429; body: { error: "rate_limited"; retryAfterSeconds: number } }
  | { status: 500; body: { error: "server_error" } };

export async function handleWaitlistRequest(
  request: JsonRequest,
  options: {
    salt: string | undefined;
    store?: WaitlistStore;
    nowMs?: number;
  }
): Promise<WaitlistApiResult> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { status: 400, body: { error: "invalid_email" } };
  }

  if (!options.salt || !options.store) {
    console.error("RATE_LIMIT_SALT and waitlist store are required.");
    return { status: 500, body: { error: "server_error" } };
  }

  try {
    return await submitWaitlist(options.store, {
      email: getBodyField(body, "email"),
      website: getBodyField(body, "website"),
      ipHash: hashValue(getRequestIp(request), options.salt),
      userAgent: request.headers.get("user-agent") ?? "",
      source: "landing",
      nowMs: options.nowMs
    });
  } catch (error) {
    console.error("Waitlist submission failed", error);
    return { status: 500, body: { error: "server_error" } };
  }
}

function getBodyField(body: unknown, field: string) {
  if (typeof body !== "object" || body === null || !(field in body)) {
    return undefined;
  }

  return (body as Record<string, unknown>)[field];
}

function getRequestIp(request: JsonRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}
