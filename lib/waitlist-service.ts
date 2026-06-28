import { isYaleEmail, normalizeEmail } from "./email";
import { DEFAULT_RATE_LIMIT, DEFAULT_RATE_LIMIT_WINDOW_MS, decideRateLimit } from "./rate-limit";

export type SubmitWaitlistInput = {
  email: unknown;
  website?: unknown;
  ipHash: string;
  userAgent: string;
  source?: string;
  nowMs?: number;
};

export type SubmissionRecord = {
  email: string;
  emailHash: string;
  createdAt: Date;
  ipHash: string;
  userAgent: string;
  source: string;
};

export type WaitlistStore = {
  submitWithRateLimit(input: {
    email: string;
    ipHash: string;
    userAgent: string;
    source: string;
    nowMs: number;
    limit: number;
    windowMs: number;
  }): Promise<{ ok: true } | { ok: false; retryAfterSeconds: number }>;
};

export type SubmitWaitlistResult =
  | { status: 200; body: { ok: true } }
  | { status: 400; body: { error: "invalid_email" } }
  | { status: 429; body: { error: "rate_limited"; retryAfterSeconds: number } };

export async function submitWaitlist(
  store: WaitlistStore,
  input: SubmitWaitlistInput
): Promise<SubmitWaitlistResult> {
  if (typeof input.website === "string" && input.website.trim().length > 0) {
    return { status: 200, body: { ok: true } };
  }

  if (typeof input.email !== "string") {
    return { status: 400, body: { error: "invalid_email" } };
  }

  const email = normalizeEmail(input.email);
  if (!isYaleEmail(email)) {
    return { status: 400, body: { error: "invalid_email" } };
  }

  const nowMs = input.nowMs ?? Date.now();
  const result = await store.submitWithRateLimit({
    email,
    ipHash: input.ipHash,
    userAgent: input.userAgent,
    source: input.source ?? "waitlist",
    nowMs,
    limit: DEFAULT_RATE_LIMIT,
    windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS
  });

  if (!result.ok) {
    return {
      status: 429,
      body: {
        error: "rate_limited",
        retryAfterSeconds: result.retryAfterSeconds
      }
    };
  }

  return { status: 200, body: { ok: true } };
}

export function rateLimitDecisionForCount(currentCount: number, nowMs: number) {
  return decideRateLimit(currentCount, nowMs, DEFAULT_RATE_LIMIT, DEFAULT_RATE_LIMIT_WINDOW_MS);
}
