export type AvatarBackgroundRamp = {
  angle: number;
  stops: { color: string; at: number }[];
};

export type AvatarBackgroundPaint =
  | { kind: "solid"; color: string }
  | ({ kind: "linear" } & AvatarBackgroundRamp)
  | {
      kind: "blobs";
      base: AvatarBackgroundRamp;
      blobs: { x: number; y: number; color: string; radius: number }[];
    }
  | { kind: "checks"; first: string; second: string }
  | { kind: "dots"; dot: string; background: string; radius: number };

export type AvatarBackgroundOption = {
  background: string;
  id: string;
  label: string;
  paint: AvatarBackgroundPaint;
};

export type AvatarBackgroundSection = {
  id: "solid" | "gradient" | "pattern";
  label: string;
  options: readonly AvatarBackgroundOption[];
};

const pastelColors = [
  { label: "White", light: "#FFFFFF", deep: "#E4EBF2" },
  { label: "Cream", light: "#FFF8EE", deep: "#F3E2C6" },
  { label: "Sky", light: "#DDEEFF", deep: "#AFD4F2" },
  { label: "Mint", light: "#D6F5E8", deep: "#A5E3C9" },
  { label: "Blush", light: "#FFE0E8", deep: "#FFB8C9" },
  { label: "Lavender", light: "#EAE0FF", deep: "#C6B2F2" },
  { label: "Sunshine", light: "#FFF5CC", deep: "#FFE196" },
  { label: "Peach", light: "#FFE8D6", deep: "#FFC9A3" }
] as const;

const linear = (
  angle: number,
  ...stops: [color: string, at: number][]
): AvatarBackgroundPaint => ({
  kind: "linear",
  angle,
  stops: stops.map(([color, at]) => ({ color, at }))
});

const dots = (dot: string, background: string): AvatarBackgroundPaint => ({
  kind: "dots",
  dot,
  background,
  radius: 28
});

const checks = (first: string, second: string): AvatarBackgroundPaint => ({
  kind: "checks",
  first,
  second
});

const rampCss = ({ angle, stops }: AvatarBackgroundRamp) =>
  `linear-gradient(${angle}deg, ${stops
    .map(({ color, at }) => `${color} ${at}%`)
    .join(", ")})`;

export function avatarBackgroundCss(paint: AvatarBackgroundPaint): string {
  switch (paint.kind) {
    case "solid":
      return paint.color;
    case "linear":
      return rampCss(paint);
    case "blobs":
      return [
        ...paint.blobs.map(
          (blob) =>
            `radial-gradient(circle at ${blob.x}% ${blob.y}%, ${blob.color} 0%, transparent ${blob.radius}%)`
        ),
        rampCss(paint.base)
      ].join(", ");
    case "checks":
      return `repeating-conic-gradient(${paint.first} 0% 25%, ${paint.second} 0% 50%) 0 0 / 25% 25%`;
    case "dots": {
      const dot = `radial-gradient(circle at 50% 50%, ${paint.dot} ${paint.radius}%, transparent ${paint.radius + 1}%)`;
      return `${dot} 0 0 / 25% 25%, ${dot} 16.6667% 16.6667% / 25% 25%, ${paint.background}`;
    }
  }
}

const option = (
  id: string,
  label: string,
  paint: AvatarBackgroundPaint
): AvatarBackgroundOption => ({
  id,
  label,
  paint,
  background: avatarBackgroundCss(paint)
});

const gradientMixes = [
  option("gradient-tie-dye", "Tie Dye", {
    kind: "blobs",
    blobs: [
      { x: 18, y: 20, color: "#FFC9DE", radius: 46 },
      { x: 80, y: 16, color: "#C4E3FF", radius: 44 },
      { x: 22, y: 80, color: "#CFF2DF", radius: 44 },
      { x: 84, y: 78, color: "#FFE6B4", radius: 46 },
      { x: 50, y: 52, color: "#E4D6FF", radius: 52 }
    ],
    base: {
      angle: 180,
      stops: [
        { color: "#FFF6FA", at: 0 },
        { color: "#F3F8FF", at: 100 }
      ]
    }
  }),
  option(
    "gradient-rainbow",
    "Rainbow",
    linear(
      120,
      ["#FFD6E8", 0],
      ["#FFE6B4", 25],
      ["#CFF2DF", 50],
      ["#C4E3FF", 75],
      ["#E4D6FF", 100]
    )
  ),
  option(
    "gradient-sunset",
    "Sunset",
    linear(180, ["#FFEBCB", 0], ["#FFD2DC", 55], ["#E2D7FF", 100])
  ),
  option(
    "gradient-cotton-candy",
    "Cotton Candy",
    linear(135, ["#FFDAED", 0], ["#EADCFF", 50], ["#D6E9FF", 100])
  ),
  option(
    "gradient-aurora",
    "Aurora",
    linear(160, ["#D6F5E8", 0], ["#D9E8FF", 45], ["#EADCFF", 100])
  ),
  option(
    "gradient-twilight",
    "Twilight",
    linear(180, ["#FFE0D6", 0], ["#E0D6F5", 55], ["#C9D9F0", 100])
  ),
  option(
    "gradient-lagoon",
    "Lagoon",
    linear(200, ["#CFF2DF", 0], ["#AFD4F2", 50], ["#C6B2F2", 100])
  ),
  option(
    "gradient-peachy",
    "Peachy",
    linear(160, ["#FFF0C6", 0], ["#FFC9A3", 55], ["#FFB8C9", 100])
  )
] as const;

export const backgroundSections = [
  {
    id: "solid",
    label: "Solid",
    options: pastelColors.map(({ label, light }, index) =>
      option(`solid-${index + 1}`, label, { kind: "solid", color: light })
    )
  },
  {
    id: "gradient",
    label: "Gradient",
    options: [
      ...pastelColors.map(({ label, light, deep }, index) =>
        option(
          `gradient-${index + 1}`,
          label,
          linear(180, [light, 0], [deep, 100])
        )
      ),
      ...gradientMixes
    ]
  },
  {
    id: "pattern",
    label: "Pattern",
    options: [
      option("pattern-dots-cocoa", "Dots Cocoa", dots("#D6BBA4", "#FBF4EC")),
      option("pattern-dots-sky", "Dots Sky", dots("#AFD4F2", "#F1F7FE")),
      option("pattern-dots-mint", "Dots Mint", dots("#A5E3C9", "#F1FBF6")),
      option("pattern-dots-blush", "Dots Blush", dots("#FFB8C9", "#FFF3F6")),
      option("pattern-dots-lilac", "Dots Lilac", dots("#C6B2F2", "#F6F3FE")),
      option("pattern-dots-butter", "Dots Butter", dots("#FFE196", "#FFFCF0")),
      option("pattern-checks-blush", "Checks Blush", checks("#FFE3EE", "#E7F0FF")),
      option("pattern-checks-ink", "Checks Ink", checks("#C9CFD8", "#F7F8FA")),
      option("pattern-checks-mint", "Checks Mint", checks("#D9F2E4", "#F4FBF7")),
      option("pattern-checks-lilac", "Checks Lilac", checks("#E7DAFF", "#F7F2FF")),
      option("pattern-checks-butter", "Checks Butter", checks("#FFF0C6", "#FFFBEA"))
    ]
  }
] as const satisfies readonly AvatarBackgroundSection[];

export const backgroundColors = backgroundSections[0].options;
export const backgroundGradients = backgroundSections[1].options;
export const backgroundPatterns = backgroundSections[2].options;
export const defaultAvatarBackground = backgroundColors[0];
export const avatarBackgroundOptions = backgroundSections.flatMap(
  (section) => section.options
);

export function findAvatarBackground(id: string) {
  return (
    avatarBackgroundOptions.find((background) => background.id === id) ??
    defaultAvatarBackground
  );
}

export function avatarBackgroundCssForRectangle(
  paint: AvatarBackgroundPaint
): string {
  if (paint.kind === "checks") {
    return `repeating-conic-gradient(${paint.first} 0% 25%, ${paint.second} 0% 50%) 0 0 / 30px 30px`;
  }

  if (paint.kind === "dots") {
    const dot = `radial-gradient(circle at 50% 50%, ${paint.dot} ${paint.radius}%, transparent ${paint.radius + 1}%)`;
    return `${dot} 0 0 / 28px 28px, ${dot} 14px 14px / 28px 28px, ${paint.background}`;
  }

  if (paint.kind === "blobs") {
    return [
      ...paint.blobs.map(
        (blob) =>
          `radial-gradient(ellipse at ${blob.x}% ${blob.y}%, ${blob.color} 0%, transparent ${blob.radius}%)`
      ),
      rampCss(paint.base)
    ].join(", ");
  }

  return avatarBackgroundCss(paint);
}

const hexToRgba = (hex: string, alpha: number) => {
  const value = hex.replace("#", "");
  const normalized =
    value.length === 3 ? value.split("").map((character) => character + character).join("") : value;
  const color = Number.parseInt(normalized, 16);
  return `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, ${alpha})`;
};

function canvasRamp(
  context: CanvasRenderingContext2D,
  { angle, stops }: AvatarBackgroundRamp,
  size: number
) {
  const radians = (angle * Math.PI) / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  const length = Math.abs(size * dx) + Math.abs(size * dy);
  const center = size / 2;
  const gradient = context.createLinearGradient(
    center - (dx * length) / 2,
    center - (dy * length) / 2,
    center + (dx * length) / 2,
    center + (dy * length) / 2
  );
  stops.forEach(({ color, at }) => gradient.addColorStop(at / 100, color));
  return gradient;
}

function angleToUnitVector(angle: number) {
  const radians = (angle * Math.PI) / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  const length = Math.abs(dx) + Math.abs(dy);
  return {
    x1: 0.5 - (dx * length) / 2,
    y1: 0.5 - (dy * length) / 2,
    x2: 0.5 + (dx * length) / 2,
    y2: 0.5 + (dy * length) / 2
  };
}

function linearGradientDef(id: string, ramp: AvatarBackgroundRamp) {
  const { x1, y1, x2, y2 } = angleToUnitVector(ramp.angle);
  const stops = ramp.stops
    .map(({ color, at }) => `<stop offset="${at}%" stop-color="${color}"/>`)
    .join("");
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient>`;
}

/**
 * Renders the background paint as a standalone SVG using objectBoundingBox
 * gradients/patterns (percentage-based), so the whole thing stays coherent
 * when stretched to a non-square box (preserveAspectRatio="none") instead of
 * being a fixed-aspect raster that would blur or crop when resized.
 */
export function avatarBackgroundSvg(paint: AvatarBackgroundPaint): string {
  const open = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">';
  const close = "</svg>";
  const fullRect = (fill: string) => `<rect width="100" height="100" fill="${fill}"/>`;

  if (paint.kind === "solid") {
    return `${open}${fullRect(paint.color)}${close}`;
  }

  if (paint.kind === "linear") {
    return `${open}<defs>${linearGradientDef("g", paint)}</defs>${fullRect("url(#g)")}${close}`;
  }

  if (paint.kind === "blobs") {
    const defs = [linearGradientDef("base", paint.base)];
    const rects = [fullRect("url(#base)")];

    [...paint.blobs].reverse().forEach((blob, index) => {
      const id = `blob-${index}`;
      defs.push(
        `<radialGradient id="${id}" cx="${blob.x}%" cy="${blob.y}%" r="${blob.radius}%">` +
          `<stop offset="0%" stop-color="${blob.color}"/>` +
          `<stop offset="100%" stop-color="${blob.color}" stop-opacity="0"/>` +
          `</radialGradient>`
      );
      rects.push(fullRect(`url(#${id})`));
    });

    return `${open}<defs>${defs.join("")}</defs>${rects.join("")}${close}`;
  }

  // Patterns use patternUnits="userSpaceOnUse" with absolute coordinates in
  // the same 0-100 space as the rest of the document. patternUnits/
  // patternContentUnits="objectBoundingBox" with fractional tile sizes is
  // inconsistently supported (it silently fails to tile in some SVG
  // renderers, including our own server-side rasterizer) — plain
  // userSpaceOnUse is the combination every renderer agrees on.
  const TILE = 25;
  const CELL = TILE / 2;

  if (paint.kind === "checks") {
    return (
      `${open}<defs><pattern id="p" patternUnits="userSpaceOnUse" width="${TILE}" height="${TILE}">` +
      `<rect width="${CELL}" height="${CELL}" x="0" y="0" fill="${paint.first}"/>` +
      `<rect width="${CELL}" height="${CELL}" x="${CELL}" y="0" fill="${paint.second}"/>` +
      `<rect width="${CELL}" height="${CELL}" x="0" y="${CELL}" fill="${paint.second}"/>` +
      `<rect width="${CELL}" height="${CELL}" x="${CELL}" y="${CELL}" fill="${paint.first}"/>` +
      `</pattern></defs>${fullRect("url(#p)")}${close}`
    );
  }

  return (
    `${open}<defs>` +
    `<radialGradient id="dot" cx="50%" cy="50%" r="50%">` +
    `<stop offset="${paint.radius}%" stop-color="${paint.dot}"/>` +
    `<stop offset="${paint.radius + 1}%" stop-color="${paint.dot}" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<pattern id="p" patternUnits="userSpaceOnUse" width="${TILE}" height="${TILE}">` +
    `<rect width="${TILE}" height="${TILE}" fill="${paint.background}"/>` +
    `<circle cx="${CELL}" cy="${CELL}" r="${CELL}" fill="url(#dot)"/>` +
    `</pattern>` +
    `</defs>${fullRect("url(#p)")}${close}`
  );
}

export function drawAvatarBackground(
  context: CanvasRenderingContext2D,
  paint: AvatarBackgroundPaint,
  size: number
) {
  if (paint.kind === "solid" || paint.kind === "linear") {
    context.fillStyle =
      paint.kind === "solid" ? paint.color : canvasRamp(context, paint, size);
    context.fillRect(0, 0, size, size);
    return;
  }

  if (paint.kind === "blobs") {
    context.fillStyle = canvasRamp(context, paint.base, size);
    context.fillRect(0, 0, size, size);
    [...paint.blobs].reverse().forEach((blob) => {
      const x = (blob.x / 100) * size;
      const y = (blob.y / 100) * size;
      const farthestCorner = Math.max(
        Math.hypot(x, y),
        Math.hypot(size - x, y),
        Math.hypot(x, size - y),
        Math.hypot(size - x, size - y)
      );
      const radius = (blob.radius / 100) * farthestCorner;
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, blob.color);
      gradient.addColorStop(1, hexToRgba(blob.color, 0));
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
    });
    return;
  }

  if (paint.kind === "checks") {
    const cell = size / 8;
    for (let row = 0; row < 8; row += 1) {
      for (let column = 0; column < 8; column += 1) {
        context.fillStyle = (row + column) % 2 === 0 ? paint.second : paint.first;
        context.fillRect(column * cell, row * cell, cell, cell);
      }
    }
    return;
  }

  context.fillStyle = paint.background;
  context.fillRect(0, 0, size, size);
  const tile = size / 4;
  const radius = (tile / 2) * Math.SQRT2;
  const drawDot = (x: number, y: number) => {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(paint.radius / 100, paint.dot);
    gradient.addColorStop((paint.radius + 1) / 100, hexToRgba(paint.dot, 0));
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };

  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      drawDot((column + 0.5) * tile, (row + 0.5) * tile);
    }
  }
  for (let row = 0; row <= 4; row += 1) {
    for (let column = 0; column <= 4; column += 1) {
      drawDot(column * tile, row * tile);
    }
  }
}
