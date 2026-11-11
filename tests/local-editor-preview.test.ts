import { afterEach, expect, it, vi } from "vitest";
import { isLocalEditorPreview } from "@/lib/local-editor-preview";

afterEach(() => vi.unstubAllEnvs());

it("requires development mode and the device-local opt-in", () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("YALEMOJI_LOCAL_EDITOR", "");
  expect(isLocalEditorPreview("localhost:3001")).toBe(false);
  vi.stubEnv("YALEMOJI_LOCAL_EDITOR", "1");
  expect(isLocalEditorPreview("localhost:3001")).toBe(true);
  vi.stubEnv("NODE_ENV", "production");
  expect(isLocalEditorPreview("localhost:3001")).toBe(false);
});

it("only accepts loopback hosts", () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("YALEMOJI_LOCAL_EDITOR", "1");
  for (const host of ["localhost", "localhost:3001", "127.0.0.1:3001", "[::1]:3001"]) {
    expect(isLocalEditorPreview(host)).toBe(true);
  }
  for (const host of [null, "yalemoji.com", "192.168.1.3:3001", "localhost.evil.com", "evil.com:localhost", "localhost:3001@evil.com"]) {
    expect(isLocalEditorPreview(host)).toBe(false);
  }
});
