import { describe, expect, it } from "vitest";
import { getPageContext, withPageContext } from "@/lib/page-context";

describe("page context", () => {
  it("normalizes app refs and carries mode through local navigation", () => {
    const source = "ref=Yale+Menus&mode=dark&unrelated=secret";
    expect(withPageContext("/editor", source)).toBe("/editor?ref=yalemeals&mode=dark");
    expect(withPageContext("/api/auth/login", source)).toBe("/api/auth/login?ref=yalemeals&mode=dark");
    expect(getPageContext(source)).toBe("ref=yalemeals&mode=dark");
  });

  it("does not invent a mode or leak context to an external app", () => {
    expect(withPageContext("/editor", "ref=CourseTable")).toBe("/editor?ref=coursetable");
    expect(withPageContext("/", "")).toBe("/");
    expect(withPageContext("https://yalies.io", "ref=coursetable&mode=dark")).toBe("https://yalies.io");
    expect(withPageContext("//example.com", "mode=dark")).toBe("//example.com");
  });
});
