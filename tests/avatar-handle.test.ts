import { describe, expect, it } from "vitest";
import { parseHandle } from "@/lib/avatar-handle";

describe("parseHandle", () => {
  it("parses a valid netid and extension", () => {
    expect(parseHandle("yaf23.svg")).toEqual({ netid: "yaf23", ext: "svg" });
    expect(parseHandle("yaf23.png")).toEqual({ netid: "yaf23", ext: "png" });
  });

  it("rejects an unsupported extension", () => {
    expect(parseHandle("yaf23.jpg")).toBeNull();
    expect(parseHandle("yaf23")).toBeNull();
  });

  it("rejects an invalid netid", () => {
    expect(parseHandle("../../etc-passwd.svg")).toBeNull();
    expect(parseHandle(".svg")).toBeNull();
    expect(parseHandle("Not_Valid.png")).toBeNull();
  });
});
