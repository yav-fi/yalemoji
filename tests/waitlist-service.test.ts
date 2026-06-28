import { describe, expect, it } from "vitest";
import { rateLimitDecisionForCount, submitWaitlist, type WaitlistStore } from "@/lib/waitlist-service";

function createMemoryStore(): WaitlistStore {
  const counts = new Map<string, number>();
  const submissions = new Set<string>();

  return {
    async submitWithRateLimit(input) {
      const windowStart = Math.floor(input.nowMs / input.windowMs) * input.windowMs;
      const key = `${input.ipHash}:${windowStart}`;
      const currentCount = counts.get(key) ?? 0;

      if (currentCount >= input.limit) {
        return {
          ok: false,
          retryAfterSeconds: Math.ceil((windowStart + input.windowMs - input.nowMs) / 1000)
        };
      }

      counts.set(key, currentCount + 1);
      submissions.add(input.email);
      submissions.add(input.email);
      return { ok: true };
    }
  };
}

describe("waitlist service", () => {
  it("submits a valid Yale email", async () => {
    const result = await submitWaitlist(createMemoryStore(), {
      email: "student@yale.edu",
      ipHash: "ip",
      userAgent: "test",
      nowMs: 0
    });

    expect(result).toEqual({ status: 200, body: { ok: true } });
  });

  it("returns success for duplicates because enumeration should not be possible", async () => {
    const store = createMemoryStore();
    await submitWaitlist(store, {
      email: "student@yale.edu",
      ipHash: "ip",
      userAgent: "test",
      nowMs: 0
    });

    const result = await submitWaitlist(store, {
      email: "student@yale.edu",
      ipHash: "ip",
      userAgent: "test",
      nowMs: 1
    });

    expect(result).toEqual({ status: 200, body: { ok: true } });
  });

  it("rejects invalid email addresses", async () => {
    const result = await submitWaitlist(createMemoryStore(), {
      email: "student@example.com",
      ipHash: "ip",
      userAgent: "test",
      nowMs: 0
    });

    expect(result).toEqual({ status: 400, body: { error: "invalid_email" } });
  });

  it("silently accepts honeypot submissions", async () => {
    const result = await submitWaitlist(createMemoryStore(), {
      email: "bot@example.com",
      website: "https://spam.example",
      ipHash: "ip",
      userAgent: "test",
      nowMs: 0
    });

    expect(result).toEqual({ status: 200, body: { ok: true } });
  });

  it("rate limits after five attempts per hour", async () => {
    const store = createMemoryStore();

    for (let index = 0; index < 5; index += 1) {
      await submitWaitlist(store, {
        email: `student${index}@yale.edu`,
        ipHash: "ip",
        userAgent: "test",
        nowMs: index
      });
    }

    const result = await submitWaitlist(store, {
      email: "student6@yale.edu",
      ipHash: "ip",
      userAgent: "test",
      nowMs: 5
    });

    expect(result.status).toBe(429);
    expect(result.body).toMatchObject({ error: "rate_limited" });
  });

  it("computes rate limit decisions from count and time", () => {
    expect(rateLimitDecisionForCount(4, 1_000)).toMatchObject({ allowed: true, windowStart: 0 });
    expect(rateLimitDecisionForCount(5, 1_000)).toMatchObject({ allowed: false, windowStart: 0 });
  });
});
