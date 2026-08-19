import { describe, expect, it } from "vitest";
import {
  findOpaquePixelBounds,
  fitBoundsInsideSquare
} from "@/lib/avatar-image-fit";

describe("transparent avatar fitting", () => {
  it("finds the visible alpha bounds", () => {
    const pixels = new Uint8ClampedArray(5 * 5 * 4);
    for (const [x, y] of [
      [1, 2],
      [3, 2],
      [2, 4]
    ]) {
      pixels[(y * 5 + x) * 4 + 3] = 255;
    }

    expect(findOpaquePixelBounds(pixels, 5, 5)).toEqual({
      x: 1,
      y: 2,
      width: 3,
      height: 3
    });
  });

  it("centers artwork with at least ten percent padding", () => {
    const fitted = fitBoundsInsideSquare(
      { x: 100, y: 20, width: 400, height: 800 },
      1000,
      0.1
    );

    expect(fitted).toEqual({
      x: 300,
      y: 100,
      width: 400,
      height: 800
    });
  });

  it("zooms wide artwork while keeping symmetric vertical space", () => {
    const fitted = fitBoundsInsideSquare(
      { x: 0, y: 0, width: 800, height: 400 },
      1000,
      0.1
    );

    expect(fitted.x).toBe(100);
    expect(fitted.y).toBe(300);
    expect(fitted.width).toBe(800);
    expect(fitted.height).toBe(400);
  });
});
