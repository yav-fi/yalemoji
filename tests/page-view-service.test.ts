import { describe, expect, it } from "vitest";
import {
  logPageView,
  normalizePath,
  normalizeRef,
  type PageViewRecord,
  type PageViewStore
} from "@/lib/page-view-service";

function createMemoryStore() {
  const records: PageViewRecord[] = [];
  const store: PageViewStore = {
    async logPageView(record) {
      records.push(record);
    }
  };

  return { records, store };
}

describe("page view service", () => {
  it("normalizes missing refs to none", () => {
    expect(normalizeRef(undefined)).toBe("none");
    expect(normalizeRef("")).toBe("none");
    expect(normalizeRef("  ")).toBe("none");
  });

  it("normalizes ref strings", () => {
    expect(normalizeRef("  instagram ")).toBe("instagram");
    expect(normalizeRef("x".repeat(130))).toHaveLength(120);
  });

  it("normalizes paths", () => {
    expect(normalizePath("/?ref=flyer")).toBe("/?ref=flyer");
    expect(normalizePath("https://example.com")).toBe("/");
  });

  it("logs page views", async () => {
    const { records, store } = createMemoryStore();

    const result = await logPageView(store, {
      ref: "flyer",
      ipHash: "ip-hash",
      userAgent: "vitest",
      path: "/?ref=flyer",
      nowMs: 0
    });

    expect(result).toEqual({ status: 200, body: { ok: true } });
    expect(records).toEqual([
      {
        ref: "flyer",
        ipHash: "ip-hash",
        userAgent: "vitest",
        path: "/?ref=flyer",
        createdAt: new Date(0)
      }
    ]);
  });
});
