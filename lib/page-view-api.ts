import { hashValue } from "./hash";
import { logPageView, type PageViewStore } from "./page-view-service";

type JsonRequest = {
  headers: Headers;
  json(): Promise<unknown>;
};

export type PageViewApiResult =
  | { status: 200; body: { ok: true } }
  | { status: 500; body: { error: "server_error" } };

export async function handlePageViewRequest(
  request: JsonRequest,
  options: {
    salt: string | undefined;
    store?: PageViewStore;
    nowMs?: number;
  }
): Promise<PageViewApiResult> {
  let body: unknown = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!options.salt || !options.store) {
    console.error("RATE_LIMIT_SALT and page-view store are required.");
    return { status: 500, body: { error: "server_error" } };
  }

  try {
    return await logPageView(options.store, {
      ref: getBodyField(body, "ref"),
      ipHash: hashValue(getRequestIp(request), options.salt),
      userAgent: request.headers.get("user-agent") ?? "",
      path: getBodyField(body, "path"),
      nowMs: options.nowMs
    });
  } catch (error) {
    console.error("Page view logging failed", error);
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
