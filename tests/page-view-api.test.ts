import { describe, expect, it } from "vitest";
import { handlePageViewRequest } from "@/lib/page-view-api";
import type { PageViewRecord, PageViewStore } from "@/lib/page-view-service";

function createRequest(body: unknown) {
  return new Request("https://yalemoji.example/api/page-view", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "vitest",
      "x-forwarded-for": "203.0.113.20"
    },
    body: JSON.stringify(body)
  });
}

function createMemoryStore() {
  const records: PageViewRecord[] = [];
  const store: PageViewStore = {
    async logPageView(record) {
      records.push(record);
    }
  };

  return { records, store };
}

describe("page view API", () => {
  it("logs explicit refs", async () => {
    const { records, store } = createMemoryStore();
    const result = await handlePageViewRequest(createRequest({ ref: "poster", path: "/?ref=poster" }), {
      salt: "test-salt",
      store,
      nowMs: 0
    });

    expect(result).toEqual({ status: 200, body: { ok: true } });
    expect(records[0]).toMatchObject({
      ref: "poster",
      userAgent: "vitest",
      path: "/?ref=poster"
    });
  });

  it("logs none when ref is missing", async () => {
    const { records, store } = createMemoryStore();
    const result = await handlePageViewRequest(createRequest({ path: "/" }), {
      salt: "test-salt",
      store,
      nowMs: 0
    });

    expect(result).toEqual({ status: 200, body: { ok: true } });
    expect(records[0]?.ref).toBe("none");
  });

  it("returns server_error when the store fails", async () => {
    const result = await handlePageViewRequest(createRequest({ ref: "poster", path: "/?ref=poster" }), {
      salt: "test-salt",
      store: {
        async logPageView() {
          throw new Error("firestore unavailable");
        }
      },
      nowMs: 0
    });

    expect(result).toEqual({ status: 500, body: { error: "server_error" } });
  });
});
