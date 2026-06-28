import { describe, expect, it } from "vitest";
import { isYaleEmail, normalizeEmail } from "@/lib/email";

describe("email helpers", () => {
  it("normalizes whitespace and casing", () => {
    expect(normalizeEmail("  Student@YALE.EDU ")).toBe("student@yale.edu");
  });

  it("accepts yale.edu addresses", () => {
    expect(isYaleEmail("student@yale.edu")).toBe(true);
    expect(isYaleEmail("first.last@yale.edu")).toBe(true);
  });

  it("rejects non-Yale and malformed addresses", () => {
    expect(isYaleEmail("student@example.com")).toBe(false);
    expect(isYaleEmail("student@yale.edu.example.com")).toBe(false);
    expect(isYaleEmail("student")).toBe(false);
  });
});
