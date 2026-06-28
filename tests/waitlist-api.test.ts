import { describe, expect, it } from "vitest";
import { handleWaitlistRequest } from "@/lib/waitlist-api";
import type { WaitlistStore } from "@/lib/waitlist-service";

function createRequest(body: unknown) {
  return new Request("https://yalemoji.example/api/waitlist", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "vitest",
      "x-forwarded-for": "203.0.113.10"
    },
    body: JSON.stringify(body)
  });
}

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
      return { ok: true };
    }
  };
}

describe("waitlist API contract", () => {
  it("accepts a valid Yale email", async () => {
    const result = await handleWaitlistRequest(createRequest({ email: "student@yale.edu" }), {
      salt: "test-salt",
      store: createMemoryStore(),
      nowMs: 0
    });

    expect(result).toEqual({ status: 200, body: { ok: true } });
  });

  it("returns success for duplicate submissions", async () => {
    const store = createMemoryStore();

    await handleWaitlistRequest(createRequest({ email: "student@yale.edu" }), {
      salt: "test-salt",
      store,
      nowMs: 0
    });
    const result = await handleWaitlistRequest(createRequest({ email: "student@yale.edu" }), {
      salt: "test-salt",
      store,
      nowMs: 1
    });

    expect(result).toEqual({ status: 200, body: { ok: true } });
  });

  it("rejects invalid email", async () => {
    const result = await handleWaitlistRequest(createRequest({ email: "student@example.com" }), {
      salt: "test-salt",
      store: createMemoryStore(),
      nowMs: 0
    });

    expect(result).toEqual({ status: 400, body: { error: "invalid_email" } });
  });

  it("silently accepts honeypot submissions", async () => {
    const result = await handleWaitlistRequest(
      createRequest({ email: "bot@example.com", website: "https://spam.example" }),
      {
        salt: "test-salt",
        store: createMemoryStore(),
        nowMs: 0
      }
    );

    expect(result).toEqual({ status: 200, body: { ok: true } });
  });

  it("returns rate limit responses", async () => {
    const store = createMemoryStore();

    for (let index = 0; index < 5; index += 1) {
      await handleWaitlistRequest(createRequest({ email: `student${index}@yale.edu` }), {
        salt: "test-salt",
        store,
        nowMs: index
      });
    }

    const result = await handleWaitlistRequest(createRequest({ email: "student6@yale.edu" }), {
      salt: "test-salt",
      store,
      nowMs: 5
    });

    expect(result.status).toBe(429);
    expect(result.body).toMatchObject({ error: "rate_limited" });
  });

  it("returns server_error when the store fails", async () => {
    const result = await handleWaitlistRequest(createRequest({ email: "student@yale.edu" }), {
      salt: "test-salt",
      store: {
        async submitWithRateLimit() {
          throw new Error("firestore unavailable");
        }
      },
      nowMs: 0
    });

    expect(result).toEqual({ status: 500, body: { error: "server_error" } });
  });
});
