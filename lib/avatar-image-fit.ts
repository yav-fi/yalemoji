export type PixelBounds = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export function findOpaquePixelBounds(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold = 2
): PixelBounds | null {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha <= alphaThreshold) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < left || bottom < top) return null;
  return {
    x: left,
    y: top,
    width: right - left + 1,
    height: bottom - top + 1
  };
}

export function fitBoundsInsideSquare(
  bounds: PixelBounds,
  outputSize: number,
  paddingRatio = 0.1
): PixelBounds {
  const safeSize = outputSize * (1 - paddingRatio * 2);
  const scale = Math.min(
    safeSize / bounds.width,
    safeSize / bounds.height
  );
  const width = bounds.width * scale;
  const height = bounds.height * scale;

  return {
    x: (outputSize - width) / 2,
    y: (outputSize - height) / 2,
    width,
    height
  };
}
