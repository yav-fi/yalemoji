import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const VALID_KEY = `ymk_${"a".repeat(43)}`;
const avatarFor = (netid: string) => ({
  version: 2,
  pngUrl: `https://cdn/${netid}.png`,
  svgUrl: `https://cdn/${netid}.svg`,
  backgroundUrl: `https://cdn/${netid}-bg.svg`
});

vi.mock("@/lib/api-keys", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-keys")>()),
  verifyApiKey: vi.fn(async (key: string) =>
    key === VALID_KEY ? { keyId: "key-id", app: "coursetable" } : null
  )
}));
vi.mock("@/lib/avatar-store", () => ({
  MAX_BATCH_LOOKUP: 100,
  checkApiKeyReadRateLimit: vi.fn(async () => ({ allowed: true, retryAfterSeconds: 0 })),
  checkAvatarReadRateLimit: vi.fn(async () => ({ allowed: true, retryAfterSeconds: 0 })),
  getCurrentAvatar: vi.fn(async (netid: string) => (netid === "abc123" ? avatarFor(netid) : null)),
  getCurrentAvatars: vi.fn(async (netids: string[]) =>
    new Map(netids.map((netid) => [netid, netid === "abc123" ? avatarFor(netid) : null]))
  )
}));

const userRoute = await import("@/app/api/v1/users/[netid]/route");
const lookupRoute = await import("@/app/api/v1/lookup/route");
const imageRoute = await import("@/app/avatar/[handle]/route");
const store = await import("@/lib/avatar-store");
const apiKeys = await import("@/lib/api-keys");

const auth = { authorization: `Bearer ${VALID_KEY}` };
const ctx = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) });

function lookupRequest(body: unknown, headers: Record<string, string> = auth) {
  return new NextRequest("http://localhost/api/v1/lookup", {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
}

describe("GET /api/v1/users/{netid}", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an API key", async () => {
    const res = await userRoute.GET(
      new NextRequest("http://localhost/api/v1/users/abc123"),
      ctx({ netid: "abc123" })
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "missing_api_key" });
    expect(store.getCurrentAvatar).not.toHaveBeenCalled();
  });

  it("rejects an unknown key", async () => {
    const res = await userRoute.GET(
      new NextRequest("http://localhost/api/v1/users/abc123", {
        headers: { authorization: `Bearer ymk_${"b".repeat(43)}` }
      }),
      ctx({ netid: "abc123" })
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "invalid_api_key" });
  });

  it("returns the avatar with a valid key, privately cached", async () => {
    const res = await userRoute.GET(
      new NextRequest("http://localhost/api/v1/users/ABC123", { headers: auth }),
      ctx({ netid: "ABC123" })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, max-age=300");
    expect(await res.json()).toEqual({
      netid: "abc123",
      avatar: {
        version: 2,
        png_url: "https://cdn/abc123.png",
        svg_url: "https://cdn/abc123.svg",
        background_url: "https://cdn/abc123-bg.svg"
      }
    });
  });

  it("is rate limited per key", async () => {
    vi.mocked(store.checkApiKeyReadRateLimit).mockResolvedValueOnce({
      allowed: false,
      retryAfterSeconds: 12
    });
    const res = await userRoute.GET(
      new NextRequest("http://localhost/api/v1/users/abc123", { headers: auth }),
      ctx({ netid: "abc123" })
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("12");
  });
});

describe("POST /api/v1/lookup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an API key", async () => {
    const res = await lookupRoute.POST(lookupRequest({ netids: ["abc123"] }, {}));
    expect(res.status).toBe(401);
  });

  it("returns every requested NetID, null when there is no avatar", async () => {
    const res = await lookupRoute.POST(
      lookupRequest({ netids: ["abc123", " ABC123 ", "zz99", "not a netid!"] })
    );
    expect(res.status).toBe(200);
    const { users } = await res.json();
    expect(Object.keys(users)).toEqual(["abc123", "zz99", "not a netid!"]);
    expect(users.abc123.png_url).toBe("https://cdn/abc123.png");
    expect(users.zz99).toBeNull();
    expect(users["not a netid!"]).toBeNull();
    // Deduped, and invalid NetIDs never reach Firestore.
    expect(store.getCurrentAvatars).toHaveBeenCalledWith(["abc123", "zz99"]);
  });

  it("rejects a malformed body", async () => {
    expect((await lookupRoute.POST(lookupRequest({ netid: "abc123" }))).status).toBe(400);
    expect((await lookupRoute.POST(lookupRequest({ netids: [1, 2] }))).status).toBe(400);
  });

  it("caps the batch size", async () => {
    const netids = Array.from({ length: 101 }, (_, i) => `u${i}`);
    const res = await lookupRoute.POST(lookupRequest({ netids }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "too_many_netids", max: 100 });
    expect(store.getCurrentAvatars).not.toHaveBeenCalled();
  });
});

describe("GET /avatar/{netid}.{png,svg}", () => {
  beforeEach(() => vi.clearAllMocks());

  const get = (handle: string, headers: Record<string, string> = auth) =>
    imageRoute.GET(new NextRequest(`https://yalemoji.com/avatar/${handle}`, { headers }), ctx({ handle }));

  it("requires an API key before resolving any NetID or fallback", async () => {
    for (const handle of ["abc123.png", "zz99.svg", "invalid!.png"]) {
      const res = await get(handle, {});
      expect(res.status).toBe(401);
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(res.headers.get("location")).toBeNull();
    }
    expect(store.getCurrentAvatar).not.toHaveBeenCalled();
  });

  it("rejects an invalid key without looking up the avatar", async () => {
    const res = await get("abc123.png", { authorization: `Bearer ymk_${"b".repeat(43)}` });
    expect(res.status).toBe(401);
    expect(store.getCurrentAvatar).not.toHaveBeenCalled();
  });

  it("redirects authenticated callers to privately cached avatar URLs", async () => {
    const res = await get("abc123.png");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://cdn/abc123.png");
    expect(res.headers.get("cache-control")).toBe("private, max-age=300");
    expect((await get("ABC123.svg")).headers.get("location")).toBe("https://cdn/abc123.svg");
  });

  it("falls back to the default image when there is no avatar", async () => {
    const png = await get("zz99.png");
    expect(png.status).toBe(302);
    expect(png.headers.get("location")).toBe("https://yalemoji.com/assets/default-avatar.png");
    expect(png.headers.get("cache-control")).toBe("private, max-age=300");

    const svg = await get("zz99.svg");
    expect(svg.headers.get("location")).toBe("https://yalemoji.com/assets/default-avatar.svg");
  });

  it("falls back for an invalid NetID", async () => {
    expect((await get("Not_A_Netid!.png")).headers.get("location")).toContain("default-avatar.png");
    expect(store.getCurrentAvatar).not.toHaveBeenCalled();
  });

  it("does not cache a fallback during an outage and recovers on the next request", async () => {
    vi.mocked(store.getCurrentAvatar).mockRejectedValueOnce(new Error("firestore down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});
    const res = await get("abc123.png");
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("location")).toBeNull();
    expect(await res.json()).toEqual({ error: "server_error" });
    expect((await get("abc123.png")).headers.get("location")).toBe("https://cdn/abc123.png");
  });

  it("rate limits image lookups per API key", async () => {
    vi.mocked(store.checkApiKeyReadRateLimit).mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 12 });
    const res = await get("abc123.png");
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("12");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(store.getCurrentAvatar).not.toHaveBeenCalled();
  });

  it.each(["key verification", "rate limiting"])("returns an uncached error if %s is unavailable", async (failure) => {
    const operation = failure === "key verification" ? apiKeys.verifyApiKey : store.checkApiKeyReadRateLimit;
    vi.mocked(operation).mockRejectedValueOnce(new Error("firestore down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});
    const res = await get("abc123.png");
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("location")).toBeNull();
    expect(store.getCurrentAvatar).not.toHaveBeenCalled();
  });

  it("404s an unsupported extension", async () => {
    expect((await get("abc123.gif")).status).toBe(404);
  });
});
