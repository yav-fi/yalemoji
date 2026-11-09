import { normalizeAppRef } from "@/config/yale-apps";

export type PageViewInput = {
  ref: unknown;
  ipHash: string;
  userAgent: string;
  path: unknown;
  nowMs?: number;
};

export type PageViewRecord = {
  ref: string;
  ipHash: string;
  userAgent: string;
  path: string;
  createdAt: Date;
};

export type PageViewStore = {
  logPageView(record: PageViewRecord): Promise<void>;
};

export type PageViewResult =
  | { status: 200; body: { ok: true } }
  | { status: 500; body: { error: "server_error" } };

export async function logPageView(
  store: PageViewStore,
  input: PageViewInput
): Promise<PageViewResult> {
  const ref = normalizeRef(input.ref);
  const path = normalizePath(input.path);

  await store.logPageView({
    ref,
    ipHash: input.ipHash,
    userAgent: input.userAgent,
    path,
    createdAt: new Date(input.nowMs ?? Date.now())
  });

  return { status: 200, body: { ok: true } };
}

export function normalizeRef(ref: unknown) {
  return normalizeAppRef(ref);
}

export function normalizePath(path: unknown) {
  if (typeof path !== "string") {
    return "/";
  }

  const trimmed = path.trim();
  if (!trimmed || !trimmed.startsWith("/")) {
    return "/";
  }

  return trimmed.slice(0, 250);
}
