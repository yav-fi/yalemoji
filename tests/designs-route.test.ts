import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn(async () => ({ netid: "abc123" })) }));
vi.mock("@/lib/avatar-store", () => ({
  checkDesignEditRateLimit: vi.fn(async () => ({ allowed: true, retryAfterSeconds: 0 })),
  deleteDesign: vi.fn(async () => "ok"),
  renameDesign: vi.fn(async () => "ok")
}));

const { DELETE, PATCH } = await import("@/app/api/designs/[version]/route");
const { getCurrentUser } = await import("@/lib/auth");
const { checkDesignEditRateLimit, deleteDesign, renameDesign } = await import(
  "@/lib/avatar-store"
);

const ctx = (version: string) => ({ params: Promise.resolve({ version }) });

function patchRequest(body: unknown, version = "3") {
  return new NextRequest(`http://localhost/api/designs/${version}`, {
    method: "PATCH",
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
}

function deleteRequest(version = "3") {
  return new NextRequest(`http://localhost/api/designs/${version}`, { method: "DELETE" });
}

beforeEach(() => vi.clearAllMocks());

describe("PATCH /api/designs/{version}", () => {
  it("requires a session", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);
    const response = await PATCH(patchRequest({ name: "Beach day" }), ctx("3"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthenticated" });
    expect(renameDesign).not.toHaveBeenCalled();
  });

  it("applies the design-edit rate limit", async () => {
    vi.mocked(checkDesignEditRateLimit).mockResolvedValueOnce({
      allowed: false,
      retryAfterSeconds: 120
    });
    const response = await PATCH(patchRequest({ name: "Beach day" }), ctx("3"));

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "rate_limited", retryAfterSeconds: 120 });
    expect(checkDesignEditRateLimit).toHaveBeenCalledWith("abc123");
    expect(renameDesign).not.toHaveBeenCalled();
  });

  it("rejects an empty name", async () => {
    const response = await PATCH(patchRequest({ name: "" }), ctx("3"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_name" });
    expect(renameDesign).not.toHaveBeenCalled();
  });

  it("rejects a body that isn't JSON", async () => {
    const response = await PATCH(patchRequest("{not json"), ctx("3"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_name" });
  });

  it("returns 404 when the design doesn't exist", async () => {
    vi.mocked(renameDesign).mockResolvedValueOnce("not_found");
    const response = await PATCH(patchRequest({ name: "Beach day" }), ctx("3"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  });

  it("renames the session user's design with the cleaned name", async () => {
    const response = await PATCH(patchRequest({ name: "  Beach   day " }), ctx("3"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ name: "Beach day" });
    expect(renameDesign).toHaveBeenCalledWith("abc123", 3, "Beach day");
  });

  it("treats a malformed version as not found without touching the store", async () => {
    const response = await PATCH(patchRequest({ name: "Beach day" }, "007"), ctx("007"));

    expect(response.status).toBe(404);
    expect(checkDesignEditRateLimit).not.toHaveBeenCalled();
    expect(renameDesign).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/designs/{version}", () => {
  it("requires a session", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);
    const response = await DELETE(deleteRequest(), ctx("3"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthenticated" });
    expect(deleteDesign).not.toHaveBeenCalled();
  });

  it("applies the design-edit rate limit", async () => {
    vi.mocked(checkDesignEditRateLimit).mockResolvedValueOnce({
      allowed: false,
      retryAfterSeconds: 120
    });
    const response = await DELETE(deleteRequest(), ctx("3"));

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "rate_limited", retryAfterSeconds: 120 });
    expect(deleteDesign).not.toHaveBeenCalled();
  });

  it("returns 404 when the design doesn't exist", async () => {
    vi.mocked(deleteDesign).mockResolvedValueOnce("not_found");
    const response = await DELETE(deleteRequest(), ctx("3"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  });

  it("refuses to remove the current design", async () => {
    vi.mocked(deleteDesign).mockResolvedValueOnce("current");
    const response = await DELETE(deleteRequest(), ctx("3"));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "current_design" });
  });

  it("removes the session user's design", async () => {
    const response = await DELETE(deleteRequest(), ctx("3"));

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(deleteDesign).toHaveBeenCalledWith("abc123", 3);
  });

  it("treats a malformed version as not found without touching the store", async () => {
    const response = await DELETE(deleteRequest("007"), ctx("007"));

    expect(response.status).toBe(404);
    expect(checkDesignEditRateLimit).not.toHaveBeenCalled();
    expect(deleteDesign).not.toHaveBeenCalled();
  });
});

describe("when the rate-limit check itself fails", () => {
  it("returns a shaped 500 for both methods and touches nothing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(checkDesignEditRateLimit).mockRejectedValue(new Error("firestore down"));

    const patch = await PATCH(patchRequest({ name: "Park" }), ctx("3"));
    expect(patch.status).toBe(500);
    expect(await patch.json()).toEqual({ error: "server_error" });

    const del = await DELETE(deleteRequest(), ctx("3"));
    expect(del.status).toBe(500);
    expect(await del.json()).toEqual({ error: "server_error" });

    expect(renameDesign).not.toHaveBeenCalled();
    expect(deleteDesign).not.toHaveBeenCalled();
    vi.mocked(checkDesignEditRateLimit).mockReset();
    vi.mocked(checkDesignEditRateLimit).mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  });
});
