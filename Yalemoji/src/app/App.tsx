import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// ── SVG asset loading ──────────────────────────────────────────────────────
// Every asset is authored on a 502×502 canvas. They are loaded as raw markup
// rather than as <img> URLs so that skin/hair placeholder colors can be
// swapped at render time. Vite parses these options statically, so the object
// literal has to be inlined at each call site.
const faceFiles = import.meta.glob<string>(
  "../imports/Face/*.svg",
  { eager: true, query: "?raw", import: "default" },
);
const eyeFiles = import.meta.glob<string>(
  "../imports/Eyes/*.svg",
  { eager: true, query: "?raw", import: "default" },
);
const mouthFiles = import.meta.glob<string>(
  "../imports/Mouths/*.svg",
  { eager: true, query: "?raw", import: "default" },
);
const browFiles = import.meta.glob<string>(
  "../imports/Brows/*.svg",
  { eager: true, query: "?raw", import: "default" },
);
const hairFiles = import.meta.glob<string>(
  "../imports/Hairs/*.svg",
  { eager: true, query: "?raw", import: "default" },
);
const accessoryFiles = import.meta.glob<string>(
  "../imports/Accessories/*.svg",
  { eager: true, query: "?raw", import: "default" },
);
const facialHairFiles = import.meta.glob<string>(
  "../imports/FacialHair/*.svg",
  { eager: true, query: "?raw", import: "default" },
);
const noseFiles = import.meta.glob<string>(
  "../imports/Nose *.svg",
  { eager: true, query: "?raw", import: "default" },
);

const VIEW_BOX = "0 0 502 502";

// Exported PNG: the avatar sits inside an even 90px margin all round.
const EXPORT_SIZE = 1080;
const EXPORT_AVATAR = 900;

const fileName = (path: string) =>
  path.slice(path.lastIndexOf("/") + 1);

/** Drops the file's own <svg> wrapper so the markup can be re-hosted at any size. */
function innerMarkup(src: string): string {
  return src
    .replace(/[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>[\s\S]*/, "")
    .trim();
}

/** Sorts `Prefix_12.svg` style names by their trailing number. */
function loadNumbered(files: Record<string, string>): string[] {
  const seq = (path: string) =>
    parseInt(fileName(path).match(/(\d+)/)?.[1] ?? "0", 10);
  return Object.keys(files)
    .sort((a, b) => seq(a) - seq(b))
    .map((path) => innerMarkup(files[path]));
}

const FACES = loadNumbered(faceFiles);
const EYES = loadNumbered(eyeFiles);
const MOUTHS = loadNumbered(mouthFiles);
const BROWS = loadNumbered(browFiles);
// Drawn against the same 502×502 face, and inked in the hair placeholder
// colors so a beard tracks whatever the hair swatch is set to.
const FACIAL_HAIRS = loadNumbered(facialHairFiles);

/**
 * The nose, lifted out of the face artwork so it can sit above facial hair —
 * every face already draws this same path, so this re-draws it on top rather
 * than adding a second nose. One design today; the list keeps a picker cheap.
 */
const NOSES = loadNumbered(noseFiles);

// ── Hair: pairs of `<n>-back.svg` / `<n>-front.svg` ────────────────────────
// Some styles ship only one of the two layers. A trailing `-<variant>` (e.g.
// `2-front-1.svg`) is a distinct style that collided on export, not an extra
// layer for `2`, so it becomes its own entry.
type HairSprite = { back: string | null; front: string | null };

const HAIRS: HairSprite[] = (() => {
  const styles = new Map<string, HairSprite>();
  const rank = new Map<string, number>();

  for (const path of Object.keys(hairFiles)) {
    const match = fileName(path).match(
      /^(\d+)-(back|front)(?:-(\d+))?\.svg$/,
    );
    if (!match) continue;
    const [, seq, side, variant] = match;
    const key = variant ? `${seq}-${variant}` : seq;
    if (!styles.has(key)) {
      styles.set(key, { back: null, front: null });
      rank.set(key, Number(seq) * 100 + Number(variant ?? 0));
    }
    styles.get(key)![side as "back" | "front"] = innerMarkup(
      hairFiles[path],
    );
  }

  return [...styles.entries()]
    .sort((a, b) => rank.get(a[0])! - rank.get(b[0])!)
    .map(([, sprite]) => sprite);
})();

// ── Accessories: one slot per type, so several can be worn at once ─────────
// The type is the letter prefix of the file name (`eyewear2.svg` → eyewear).
type AccessoryType =
  | "eyewear"
  | "ear"
  | "face"
  | "facial"
  | "hair";

const ACCESSORY_GROUPS: {
  type: AccessoryType;
  label: string;
}[] = [
  { type: "eyewear", label: "Eyewear" },
  { type: "facial", label: "Cheeks" },
  { type: "hair", label: "Hair Clips" },
  { type: "ear", label: "Earrings" },
  { type: "face", label: "College Crest" },
];

const ACCESSORIES: Record<AccessoryType, string[]> = (() => {
  const groups = {
    eyewear: [],
    ear: [],
    face: [],
    facial: [],
    hair: [],
  } as Record<AccessoryType, { seq: number; markup: string }[]>;

  for (const path of Object.keys(accessoryFiles)) {
    const match = fileName(path).match(/^([a-z]+?)(\d+)\.svg$/);
    if (!match) continue;
    const [, type, seq] = match;
    if (!(type in groups)) continue;
    groups[type as AccessoryType].push({
      seq: Number(seq),
      markup: innerMarkup(accessoryFiles[path]),
    });
  }

  const sorted = {} as Record<AccessoryType, string[]>;
  for (const { type } of ACCESSORY_GROUPS) {
    sorted[type] = groups[type]
      .sort((a, b) => a.seq - b.seq)
      .map((entry) => entry.markup);
  }
  return sorted;
})();

// ── Palettes ───────────────────────────────────────────────────────────────
const SKIN_TONES = [
  { fill: "#F9E0D2", stroke: "#F1B18B" },
  { fill: "#F9D2B6", stroke: "#F2965F" },
  { fill: "#EFB68B", stroke: "#CC6F37" },
  { fill: "#E8A068", stroke: "#C16025" },
  { fill: "#D2955A", stroke: "#A55E34" },
  { fill: "#8E5116", stroke: "#4A2814" },
  { fill: "#4C2608", stroke: "#1A0C03" },
];

const HAIR_COLORS = [
  { fill: "#363636", contrast: "#110800" },
  { fill: "#432C22", contrast: "#1E0E00" },
  { fill: "#543021", contrast: "#1E0E00" },
  { fill: "#6B2F16", contrast: "#1E0E00" },
  { fill: "#83300D", contrast: "#1E0E00" },
  { fill: "#7F471A", contrast: "#3C1C00" },
  { fill: "#AA6E20", contrast: "#573509" },
  { fill: "#CC9E48", contrast: "#88621F" },
  { fill: "#ECCE95", contrast: "#BF9348" },
  { fill: "#A85433", contrast: "#84381B" },
  { fill: "#E583B1", contrast: "#A52E66" },
  { fill: "#C67DE0", contrast: "#793D8E" },
  { fill: "#828CE3", contrast: "#3E4AAE" },
];

// Placeholder colors the artwork ships with, keyed lowercase for lookup.
const faceColors = (tone: (typeof SKIN_TONES)[number]) => ({
  "#c4c4c4": tone.fill,
  "#676767": tone.stroke,
});

const hairColors = (color: (typeof HAIR_COLORS)[number]) => ({
  "#515151": color.fill,
  "#676767": color.fill,
  black: color.contrast,
});

/** Rewrites fill/stroke placeholders. Colors absent from the map pass through. */
function recolor(
  markup: string,
  map: Record<string, string>,
): string {
  return markup.replace(
    /(fill|stroke)="([^"]*)"/g,
    (whole, attr: string, value: string) => {
      const next = map[value.toLowerCase()];
      return next ? `${attr}="${next}"` : whole;
    },
  );
}

/** Figma ids are unique per file but collide once a file is inlined twice. */
function namespaceIds(markup: string, uid: string): string {
  const ids = [...markup.matchAll(/id="([^"]+)"/g)].map(
    (match) => match[1],
  );
  return ids.reduce(
    (acc, id) =>
      acc
        .split(`id="${id}"`)
        .join(`id="${id}-${uid}"`)
        .split(`url(#${id})`)
        .join(`url(#${id}-${uid})`),
    markup,
  );
}

// ── Sprite renderer ────────────────────────────────────────────────────────
/**
 * How far ink reaches past the geometry `getBBox` reports: a stroke straddles
 * the path, so half of it hangs outside on every side. The thin mouths carry an
 * 8-unit stroke on a ~35-unit box, which is enough to clip a crop fitted to the
 * geometry alone.
 */
function strokeReach(svg: SVGSVGElement): number {
  let reach = 0;
  for (const shape of svg.querySelectorAll<SVGGraphicsElement>(
    "path, circle, ellipse, rect, line, polyline, polygon",
  )) {
    const style = getComputedStyle(shape);
    if (!style.stroke || style.stroke === "none") continue;
    reach = Math.max(reach, parseFloat(style.strokeWidth) / 2);
  }
  return reach;
}

/**
 * Zooms the viewBox to the artwork's bounds. Small pieces (an earring, a decal)
 * occupy a few pixels of the 502×502 canvas, so a thumbnail of the whole canvas
 * is unreadable. Only for previews — layers on the avatar must keep the shared
 * viewBox to stay aligned with each other.
 */
function useFitViewBox(
  ref: React.RefObject<SVGSVGElement | null>,
  enabled: boolean,
  key: string,
) {
  const [viewBox, setViewBox] = useState<string | null>(null);
  useLayoutEffect(() => {
    if (!enabled || !ref.current) {
      setViewBox(null);
      return;
    }
    // Measured off the root so any group transform is already applied.
    const box = ref.current.getBBox();
    const reach = strokeReach(ref.current);
    const width = box.width + reach * 2;
    const height = box.height + reach * 2;
    if (!width && !height) return; // a flat mouth is a zero-height line, but still has width
    const side = Math.max(width, height) * 1.24; // square crop plus breathing room
    setViewBox(
      `${box.x + box.width / 2 - side / 2} ${box.y + box.height / 2 - side / 2} ${side} ${side}`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key]);
  return viewBox;
}

function Sprite({
  markup,
  size = 502,
  colors,
  fit = false,
}: {
  /** A number of px, or any CSS length — "100%" to fill a flexible tile. */
  size?: number | string;
  markup: string;
  colors?: Record<string, string>;
  fit?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ref = useRef<SVGSVGElement>(null);
  const colorKey = colors
    ? Object.entries(colors).flat().join("|")
    : "";
  const html = useMemo(
    () =>
      namespaceIds(
        colors ? recolor(markup, colors) : markup,
        uid,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markup, colorKey, uid],
  );
  const fitted = useFitViewBox(ref, fit, markup);
  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox={fitted ?? VIEW_BOX}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function HairSprite({
  hairIndex,
  side,
  color,
  size,
}: {
  hairIndex: number;
  side: "back" | "front";
  color: (typeof HAIR_COLORS)[number];
  size: number | string;
}) {
  const markup = HAIRS[hairIndex]?.[side];
  if (!markup) return null;
  return (
    <Sprite
      markup={markup}
      size={size}
      colors={hairColors(color)}
    />
  );
}

type Category =
  | "head"
  | "eyes"
  | "eyebrows"
  | "mouth"
  | "hair"
  | "accessories"
  | "background";

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "head", label: "Face" },
  { id: "eyes", label: "Eyes" },
  { id: "eyebrows", label: "Eyebrows" },
  { id: "mouth", label: "Mouth" },
  { id: "hair", label: "Hair" },
  { id: "accessories", label: "Accessories" },
  { id: "background", label: "Background" },
];

// `deep` is the same hue a few steps down — it only ever pairs with its own
// `light` in a gradient, so the wash stays within one color.
const BG_COLORS = [
  { label: "White", light: "#ffffff", deep: "#E4EBF2" },
  { label: "Cream", light: "#FFF8EE", deep: "#F3E2C6" },
  { label: "Sky", light: "#DDEEFF", deep: "#AFD4F2" },
  { label: "Mint", light: "#D6F5E8", deep: "#A5E3C9" },
  { label: "Blush", light: "#FFE0E8", deep: "#FFB8C9" },
  { label: "Lavender", light: "#EAE0FF", deep: "#C6B2F2" },
  { label: "Sunshine", light: "#FFF5CC", deep: "#FFE196" },
  { label: "Peach", light: "#FFE8D6", deep: "#FFC9A3" },
];

// ── Background paints ──────────────────────────────────────────────────────
/**
 * Backgrounds are data, not CSS strings, because they have to be painted two
 * ways: as CSS on the canvas and the swatches, and onto a 2D context when
 * exporting a PNG (which can't be handed a CSS string). Deriving both from one
 * spec is what keeps an exported PNG matching what's on screen.
 *
 * Percentages throughout, so a paint reads the same at 44px and at 1080px.
 */
type Ramp = {
  angle: number;
  stops: { color: string; at: number }[];
};

type Paint =
  | { kind: "solid"; color: string }
  | ({ kind: "linear" } & Ramp)
  | {
      kind: "blobs";
      base: Ramp;
      blobs: {
        x: number;
        y: number;
        color: string;
        r: number;
      }[];
    }
  | { kind: "checks"; a: string; b: string }
  /** `r` is the dot radius as a share of the tile's half-diagonal, the same
   *  thing a percentage stop means to CSS. */
  | { kind: "dots"; dot: string; bg: string; r: number };

/** A quarter-width tile, plus the same tile offset half a step, puts dots at
 *  both the cell centres and the cell corners — staggered, not gridded. */
const DOT_TILE = 25;
const DOT_STAGGER = 100 / 6; // = half a tile, once CSS scales it by (1 - tile)

const rampCss = ({ angle, stops }: Ramp) =>
  `linear-gradient(${angle}deg, ${stops
    .map((s) => `${s.color} ${s.at}%`)
    .join(", ")})`;

const cssPaint = (p: Paint): string => {
  switch (p.kind) {
    case "solid":
      return p.color;
    case "linear":
      return rampCss(p);
    case "blobs":
      return [
        ...p.blobs.map(
          (b) =>
            `radial-gradient(circle at ${b.x}% ${b.y}%, ${b.color} 0%, transparent ${b.r}%)`,
        ),
        rampCss(p.base),
      ].join(", ");
    case "checks":
      return `repeating-conic-gradient(${p.a} 0% 25%, ${p.b} 0% 50%) 0 0 / 25% 25%`;
    case "dots": {
      const tile = `${DOT_TILE}% ${DOT_TILE}%`;
      const dot = `radial-gradient(circle at 50% 50%, ${p.dot} ${p.r}%, transparent ${p.r + 1}%)`;
      return [
        `${dot} 0 0 / ${tile}`,
        `${dot} ${DOT_STAGGER}% ${DOT_STAGGER}% / ${tile}`,
        p.bg,
      ].join(", ");
    }
  }
};

type BgFill = "solid" | "gradient";

const bgPaint = (
  bg: (typeof BG_COLORS)[number],
  fill: BgFill,
): Paint =>
  fill === "solid"
    ? { kind: "solid", color: bg.light }
    : {
        kind: "linear",
        angle: 180,
        stops: [
          { color: bg.light, at: 0 },
          { color: bg.deep, at: 100 },
        ],
      };

/** One checkerboard recipe, so a new colorway is just two pastels. */
const checks = (a: string, b: string): Paint => ({
  kind: "checks",
  a,
  b,
});

const ramp = (
  angle: number,
  ...stops: [string, number][]
): Paint => ({
  kind: "linear",
  angle,
  stops: stops.map(([color, at]) => ({ color, at })),
});

/** Multi-color washes — the same family as a pastel's own gradient, so they
 *  sit in the Gradient section alongside them. */
const GRADIENT_MIXES: { label: string; paint: Paint }[] = [
  {
    label: "Tie Dye",
    paint: {
      kind: "blobs",
      blobs: [
        { x: 18, y: 20, color: "#FFC9DE", r: 46 },
        { x: 80, y: 16, color: "#C4E3FF", r: 44 },
        { x: 22, y: 80, color: "#CFF2DF", r: 44 },
        { x: 84, y: 78, color: "#FFE6B4", r: 46 },
        { x: 50, y: 52, color: "#E4D6FF", r: 52 },
      ],
      base: {
        angle: 180,
        stops: [
          { color: "#FFF6FA", at: 0 },
          { color: "#F3F8FF", at: 100 },
        ],
      },
    },
  },
  {
    label: "Rainbow",
    paint: ramp(
      120,
      ["#FFD6E8", 0],
      ["#FFE6B4", 25],
      ["#CFF2DF", 50],
      ["#C4E3FF", 75],
      ["#E4D6FF", 100],
    ),
  },
  {
    label: "Sunset",
    paint: ramp(
      180,
      ["#FFEBCB", 0],
      ["#FFD2DC", 55],
      ["#E2D7FF", 100],
    ),
  },
  {
    label: "Cotton Candy",
    paint: ramp(
      135,
      ["#FFDAED", 0],
      ["#EADCFF", 50],
      ["#D6E9FF", 100],
    ),
  },
  {
    label: "Aurora",
    paint: ramp(
      160,
      ["#D6F5E8", 0],
      ["#D9E8FF", 45],
      ["#EADCFF", 100],
    ),
  },
  {
    label: "Twilight",
    paint: ramp(
      180,
      ["#FFE0D6", 0],
      ["#E0D6F5", 55],
      ["#C9D9F0", 100],
    ),
  },
  {
    label: "Lagoon",
    paint: ramp(
      200,
      ["#CFF2DF", 0],
      ["#AFD4F2", 50],
      ["#C6B2F2", 100],
    ),
  },
  {
    label: "Peachy",
    paint: ramp(
      160,
      ["#FFF0C6", 0],
      ["#FFC9A3", 55],
      ["#FFB8C9", 100],
    ),
  },
];

/** Pastel dot on a barely-tinted ground, so the dots read without shouting. */
const dots = (dot: string, bg: string): Paint => ({
  kind: "dots",
  dot,
  bg,
  r: 28,
});

const FUN_BACKGROUNDS: { label: string; paint: Paint }[] = [
  { label: "Dots Cocoa", paint: dots("#D6BBA4", "#FBF4EC") },
  { label: "Dots Sky", paint: dots("#AFD4F2", "#F1F7FE") },
  { label: "Dots Mint", paint: dots("#A5E3C9", "#F1FBF6") },
  { label: "Dots Blush", paint: dots("#FFB8C9", "#FFF3F6") },
  { label: "Dots Lilac", paint: dots("#C6B2F2", "#F6F3FE") },
  { label: "Dots Butter", paint: dots("#FFE196", "#FFFCF0") },
  {
    label: "Checks Blush",
    paint: checks("#FFE3EE", "#E7F0FF"),
  },
  { label: "Checks Ink", paint: checks("#C9CFD8", "#F7F8FA") },
  { label: "Checks Mint", paint: checks("#D9F2E4", "#F4FBF7") },
  {
    label: "Checks Lilac",
    paint: checks("#E7DAFF", "#F7F2FF"),
  },
  {
    label: "Checks Butter",
    paint: checks("#FFF0C6", "#FFFBEA"),
  },
];

type BgOption = {
  key: string;
  label: string;
  paint: Paint;
  /** The CSS form, for the canvas and the swatch. */
  value: string;
};

const bgOption = (
  key: string,
  label: string,
  paint: Paint,
): BgOption => ({ key, label, paint, value: cssPaint(paint) });

/** One flat grey for every swatch border: a translucent one bleeds and fades
 *  along with the gradient or wash sitting behind it. */
const BG_SWATCH_BORDER = "#DCE1E8";

const BG_SECTIONS: { title: string; options: BgOption[] }[] = [
  {
    title: "Solid",
    options: BG_COLORS.map((bg, i) =>
      bgOption(`solid-${i}`, bg.label, bgPaint(bg, "solid")),
    ),
  },
  {
    title: "Gradient",
    options: [
      ...BG_COLORS.map((bg, i) =>
        bgOption(
          `gradient-${i}`,
          bg.label,
          bgPaint(bg, "gradient"),
        ),
      ),
      ...GRADIENT_MIXES.map((mix, i) =>
        bgOption(`gradient-mix-${i}`, mix.label, mix.paint),
      ),
    ],
  },
  {
    title: "Pattern",
    options: FUN_BACKGROUNDS.map((fun, i) =>
      bgOption(`fun-${i}`, fun.label, fun.paint),
    ),
  },
];

// ── Painting a background onto a 2D context (for export) ───────────────────
const hexToRgba = (hex: string, alpha: number) => {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

/** Distance from a point to the box's farthest corner — what CSS sizes an
 *  unsuffixed radial-gradient against (`farthest-corner` is the default). */
const farthestCorner = (x: number, y: number, size: number) =>
  Math.max(
    Math.hypot(x, y),
    Math.hypot(size - x, y),
    Math.hypot(x, size - y),
    Math.hypot(size - x, size - y),
  );

function rampFill(
  ctx: CanvasRenderingContext2D,
  { angle, stops }: Ramp,
  size: number,
): CanvasGradient {
  // CSS angles run clockwise from "to top", so 180deg points straight down.
  const rad = (angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const len = Math.abs(size * dx) + Math.abs(size * dy);
  const cx = size / 2;
  const cy = size / 2;
  const g = ctx.createLinearGradient(
    cx - (dx * len) / 2,
    cy - (dy * len) / 2,
    cx + (dx * len) / 2,
    cy + (dy * len) / 2,
  );
  for (const s of stops) g.addColorStop(s.at / 100, s.color);
  return g;
}

function drawPaint(
  ctx: CanvasRenderingContext2D,
  paint: Paint,
  size: number,
) {
  switch (paint.kind) {
    case "solid":
      ctx.fillStyle = paint.color;
      ctx.fillRect(0, 0, size, size);
      return;
    case "linear":
      ctx.fillStyle = rampFill(ctx, paint, size);
      ctx.fillRect(0, 0, size, size);
      return;
    case "blobs": {
      ctx.fillStyle = rampFill(ctx, paint.base, size);
      ctx.fillRect(0, 0, size, size);
      // CSS paints the first background layer on top, so the blobs go down
      // back-to-front — painting them in listed order would inverse the stack.
      for (const blob of [...paint.blobs].reverse()) {
        const x = (blob.x / 100) * size;
        const y = (blob.y / 100) * size;
        const r = (blob.r / 100) * farthestCorner(x, y, size);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, blob.color);
        // Fading to `transparent` would drag the color toward black here, so
        // it fades to its own hue at zero alpha instead.
        g.addColorStop(1, hexToRgba(blob.color, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
      }
      return;
    }
    case "checks": {
      // A 25% tile of a 4-quadrant conic = an 8×8 board, starting on `b`.
      const cell = size / 8;
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          ctx.fillStyle =
            (row + col) % 2 === 0 ? paint.b : paint.a;
          ctx.fillRect(col * cell, row * cell, cell, cell);
        }
      }
      return;
    }
    case "dots": {
      ctx.fillStyle = paint.bg;
      ctx.fillRect(0, 0, size, size);
      const tile = (size * DOT_TILE) / 100;
      // Each dot is its own tile-sized gradient, so the soft edge resolves
      // exactly as the CSS stops do rather than as a hard-edged arc.
      const reach = (tile / 2) * Math.SQRT2;
      const dot = (cx: number, cy: number) => {
        const g = ctx.createRadialGradient(
          cx,
          cy,
          0,
          cx,
          cy,
          reach,
        );
        g.addColorStop(paint.r / 100, paint.dot);
        g.addColorStop(
          Math.min(1, (paint.r + 1) / 100),
          hexToRgba(paint.dot, 0),
        );
        ctx.fillStyle = g;
        ctx.fillRect(
          cx - reach,
          cy - reach,
          reach * 2,
          reach * 2,
        );
      };
      const steps = Math.round(100 / DOT_TILE);
      for (let row = 0; row < steps; row++)
        for (let col = 0; col < steps; col++)
          dot((col + 0.5) * tile, (row + 0.5) * tile);
      // The staggered layer lands on the cell corners, edges included.
      for (let row = 0; row <= steps; row++)
        for (let col = 0; col <= steps; col++)
          dot(col * tile, row * tile);
      return;
    }
  }
}

// ── Thumbnail wrapper ──────────────────────────────────────────────────────
/**
 * Even columns that stretch to fill the panel, rather than fixed tiles leaving
 * a ragged gutter. The tile size is what stays put (~72–78px square) and the
 * column count follows the width — six in a full-width panel, fewer on a phone.
 * `auto-fill` keeps the empty tracks, so a short row doesn't stretch its tiles.
 */
// Tuned so a full-width panel still lands on six columns, while a phone fits
// four at nearly the same tile size rather than three oversized ones.
const THUMB_MIN = 66;

function ThumbGrid({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="grid gap-2.5"
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${THUMB_MIN}px, 1fr))`,
      }}
    >
      {children}
    </div>
  );
}

function Thumbnail({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center justify-center rounded-lg overflow-hidden transition-all duration-150"
      style={{
        width: "100%",
        aspectRatio: "1 / 1",
        // Proportional, so the art inside keeps its inset as tiles resize.
        padding: "9%",
        background: selected ? "#dce9f5" : "#f4f6f9",
        border: selected
          ? "2px solid #00356B"
          : "2px solid transparent",
        outline: "none",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function SectionHeading({
  label,
  onClear,
}: {
  label: string;
  onClear?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: "#8a9ab0", letterSpacing: "0.1em" }}
      >
        {label}
      </p>
      {onClear && (
        <button
          onClick={onClear}
          className="text-xs"
          style={{
            color: "#00356B",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}

/** Color chips showing the fill alone — the artwork's outline color follows
 *  from it, so a preview of both just muddies the color being picked. Sits
 *  above the options it recolors, so no heading. */
function Swatches({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {options.map((color, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className="rounded-md overflow-hidden transition-all duration-100"
          style={{
            width: 32,
            height: 32,
            background: color,
            border:
              selected === i
                ? "2px solid #00356B"
                : "2px solid transparent",
            outline: "none",
            cursor: "pointer",
            boxShadow:
              selected === i
                ? "0 0 0 1px #00356B"
                : "0 0 0 1px rgba(0,0,0,0.12)",
          }}
        />
      ))}
    </div>
  );
}

/**
 * The tab row is the panel's true width: every category label has to read in
 * full on one line, and the option grid below is free to wrap into whatever
 * that leaves. Measured from the tabs themselves rather than hard-coded so it
 * survives label edits and font swaps.
 */
function useTabsWidth(
  ref: React.RefObject<HTMLElement | null>,
): number | null {
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    const tabs = [...nav.children];
    const measure = () => {
      const style = getComputedStyle(nav);
      const padding =
        parseFloat(style.paddingLeft) +
        parseFloat(style.paddingRight);
      const row = tabs.reduce(
        (sum, tab) => sum + tab.getBoundingClientRect().width,
        0,
      );
      setWidth(Math.ceil(row + padding));
    };
    // The tabs measure narrow until Inter replaces the fallback face, so watch
    // them rather than measuring once. Each tab reserves its bold width (see
    // the nav), so a tab switch never retriggers this.
    const observer = new ResizeObserver(measure);
    tabs.forEach((tab) => observer.observe(tab));
    measure();
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/**
 * Only phones stack. Tablets stay side-by-side, which means neither column can
 * hold its ideal size there: the canvas gives up width first (down to
 * CANVAS_MIN), then the panel narrows below its natural width and the category
 * tabs start scrolling.
 */
const SIDE_BY_SIDE = "(min-width: 700px)";
const CANVAS_MAX = 520;
const CANVAS_MIN = 300;
const PANEL_MIN = 280;

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);
  return matches;
}

function Layer({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeCategory, setActiveCategory] =
    useState<Category>("head");
  const [selectedFace, setSelectedFace] = useState(0);
  const [selectedSkin, setSelectedSkin] = useState(2);
  const [selectedEye, setSelectedEye] = useState<number | null>(
    null,
  );
  const [selectedBrow, setSelectedBrow] = useState<
    number | null
  >(null);
  const [selectedMouth, setSelectedMouth] = useState<
    number | null
  >(null);
  const [selectedHair, setSelectedHair] = useState<
    number | null
  >(null);
  const [selectedHairColor, setSelectedHairColor] = useState(0);
  const [selectedFacialHair, setSelectedFacialHair] = useState<
    number | null
  >(null);
  const [bg, setBg] = useState<BgOption>(
    BG_SECTIONS[0].options[0],
  );
  const [selectedAccessories, setSelectedAccessories] =
    useState<Partial<Record<AccessoryType, number>>>({});

  const skin = SKIN_TONES[selectedSkin];
  const hairColor = HAIR_COLORS[selectedHairColor];

  // One accessory per type: picking within a type replaces that type's choice.
  const toggleAccessory = (
    type: AccessoryType,
    index: number,
  ) =>
    setSelectedAccessories((prev) => {
      const next = { ...prev };
      if (next[type] === index) delete next[type];
      else next[type] = index;
      return next;
    });

  const clearAccessory = (type: AccessoryType) =>
    setSelectedAccessories((prev) => {
      const next = { ...prev };
      delete next[type];
      return next;
    });

  /**
   * The avatar, bottom layer first. The on-screen canvas and the exported PNG
   * both render this list, so the export can't drift out of step with what the
   * canvas shows.
   */
  const layers = useMemo(() => {
    const hair = hairColors(hairColor);
    const worn = (type: AccessoryType) => {
      const index = selectedAccessories[type];
      return index === undefined
        ? null
        : ACCESSORIES[type][index];
    };
    const stack: {
      markup: string;
      colors?: Record<string, string>;
    }[] = [];
    const add = (
      markup: string | null | undefined,
      colors?: Record<string, string>,
    ) => {
      if (markup) stack.push({ markup, colors });
    };

    if (selectedHair !== null)
      add(HAIRS[selectedHair]?.back, hair);
    add(FACES[selectedFace], faceColors(skin));
    add(worn("facial"));
    if (selectedMouth !== null) add(MOUTHS[selectedMouth]);
    // Over the mouth, so a mustache covers the top lip.
    if (selectedFacialHair !== null)
      add(FACIAL_HAIRS[selectedFacialHair], hair);
    // Above the facial hair, so a mustache never rides over the nose. Inked in
    // the skin outline color, like the nose the face itself draws.
    add(NOSES[0], faceColors(skin));
    // The crest is a badge on the cheek: over the blush it overlaps, but under
    // the hair and eyewear that fall across it.
    add(worn("face"));
    add(worn("ear"));
    if (selectedHair !== null)
      add(HAIRS[selectedHair]?.front, hair);
    if (selectedBrow !== null) add(BROWS[selectedBrow]);
    if (selectedEye !== null) add(EYES[selectedEye]);
    add(worn("eyewear"));
    add(worn("hair"));
    return stack;
  }, [
    selectedHair,
    selectedFace,
    selectedFacialHair,
    selectedMouth,
    selectedBrow,
    selectedEye,
    selectedAccessories,
    skin,
    hairColor,
  ]);

  const tabsRef = useRef<HTMLElement>(null);
  const panelWidth = useTabsWidth(tabsRef);
  const sideBySide = useMediaQuery(SIDE_BY_SIDE);

  // The avatar sits well inside the frame rather than filling it, so the PNG
  // has room to breathe as an icon or a profile picture.
  const exportPng = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = EXPORT_SIZE;
    canvas.height = EXPORT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawPaint(ctx, bg.paint, EXPORT_SIZE);

    // One flattened SVG of the stack: ids get namespaced per layer, the same
    // as when each Sprite is inlined on its own.
    const body = layers
      .map((layer, i) =>
        namespaceIds(
          layer.colors
            ? recolor(layer.markup, layer.colors)
            : layer.markup,
          `e${i}`,
        ),
      )
      .join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${EXPORT_AVATAR}" height="${EXPORT_AVATAR}" viewBox="${VIEW_BOX}" fill="none">${body}</svg>`;

    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      // A data URL keeps the canvas untainted, so toBlob still works.
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    });

    const inset = (EXPORT_SIZE - EXPORT_AVATAR) / 2;
    ctx.drawImage(
      image,
      inset,
      inset,
      EXPORT_AVATAR,
      EXPORT_AVATAR,
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) return;
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "yalemoji.png";
    link.click();
    URL.revokeObjectURL(href);
  };

  return (
    <div
      className="size-full flex flex-col"
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        background: "#dce5ef",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── Cross Campus background ──────────────────────────────────── */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "url('https://images.unsplash.com/photo-1723721198216-ecb4b6f2f4bb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxZYWxlJTIwVW5pdmVyc2l0eSUyMENyb3NzJTIwQ2FtcHVzJTIwTmV3JTIwSGF2ZW58ZW58MXx8fHwxNzg0MjEwNTU2fDA&ixlib=rb-4.1.0&q=80&w=1080')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(10px) saturate(0.7)",
          opacity: 0.35,
          transform: "scale(1.08)",
          zIndex: 0,
        }}
      />
      {/* ── Top Nav ──────────────────────────────────────────────────── */}
      <header
        className="shrink-0 flex items-center px-6 gap-4"
        style={{
          height: 52,
          background: "#00356B",
          boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <span
          className="text-sm font-bold tracking-widest uppercase"
          style={{ color: "#ffffff", letterSpacing: "0.14em" }}
        >
          Yalemoji
        </span>
        <div style={{ flex: 1 }} />
        <span
          className="text-xs"
          style={{
            color: "rgba(255,255,255,0.55)",
            fontWeight: 400,
          }}
        >
          Build your Yale avatar
        </span>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div
        className="flex-1 min-h-0 flex items-center justify-center overflow-y-auto"
        style={{
          position: "relative",
          zIndex: 1,
          padding: sideBySide ? 32 : 16,
          // Centred, but in a window too short for the panel it falls back to
          // top-aligned — plain `center` would push the top out of reach of the
          // scrollbar. Unsupported browsers drop this and keep the class's
          // `center`, which is where we'd otherwise be anyway.
          alignItems: "safe center",
        }}
      >
        {/* The pair is grouped so the two can share a top edge while the group
            as a whole stays centred in the window. */}
        <div
          className="flex justify-center"
          style={{
            width: "100%",
            // Side-by-side the group is only as tall as its cards, and the
            // body centres it. Stacked, it fills so the editor takes the slack.
            height: sideBySide ? undefined : "100%",
            // Phones stack: avatar on top, editor below.
            flexDirection: sideBySide ? "row" : "column",
            // Once the canvas is shorter than the panel, sharing a top edge
            // reads better than a small square floating beside a tall card.
            alignItems: sideBySide ? "flex-start" : "center",
            gap: 24,
          }}
        >
          {/* ── Canvas area ──────────────────────────────────────────── */}
          <div
            className="flex flex-col items-center gap-4"
            style={{
              // Side-by-side the canvas takes what the panel leaves, down to its
              // floor. Stacked, it's bounded by height too, so the editor below
              // still gets room.
              flex: sideBySide ? "1 1 0%" : "0 0 auto",
              maxWidth: sideBySide ? CANVAS_MAX : undefined,
              minWidth: sideBySide ? CANVAS_MIN : undefined,
              width: sideBySide
                ? undefined
                : `min(100%, ${CANVAS_MAX}px, 42vh)`,
            }}
          >
            <div
              className="relative flex items-center justify-center"
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                background: bg.value,
                borderRadius: 20,
                boxShadow:
                  "0 1px 2px rgba(0,53,107,0.06), 0 6px 24px rgba(0,53,107,0.10)",
                overflow: "hidden",
              }}
            >
              {/* Dot grid */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage:
                    "radial-gradient(circle, rgba(0,53,107,0.06) 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                  pointerEvents: "none",
                }}
              />

              {/* Layer stack, bottom to top. Sized as a share of the canvas
                (was 512 of 520) so it scales with it. */}
              <div
                style={{
                  position: "relative",
                  width: "98.5%",
                  height: "98.5%",
                }}
              >
                {layers.map((layer, i) => (
                  <Layer key={i}>
                    <Sprite
                      markup={layer.markup}
                      size="100%"
                      colors={layer.colors}
                    />
                  </Layer>
                ))}
              </div>
            </div>
          </div>

          {/* ── Edit Panel card ──────────────────────────────────────── */}
          <aside
            className="flex flex-col"
            style={{
              // The tab row sets the panel's natural width; below that it
              // narrows and the tabs scroll rather than the labels wrapping.
              width: "100%",
              maxWidth: panelWidth ?? "max-content",
              minWidth: sideBySide ? PANEL_MIN : 0,
              height: sideBySide ? 520 : undefined,
              flex: sideBySide ? "0 1 auto" : "1 1 0%",
              minHeight: sideBySide ? undefined : 260,
              background: "#ffffff",
              borderRadius: 20,
              boxShadow:
                "0 1px 2px rgba(0,53,107,0.06), 0 6px 24px rgba(0,53,107,0.10)",
              overflow: "hidden",
            }}
          >
            {/* Category tabs */}
            <nav
              ref={tabsRef}
              className="shrink-0 flex overflow-x-auto"
              style={{
                borderBottom: "1px solid rgba(0,53,107,0.08)",
                padding: "0 8px",
              }}
            >
              {CATEGORIES.map((cat) => {
                const active = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className="shrink-0 px-4 py-3 text-xs transition-all duration-100"
                    style={{
                      background: "transparent",
                      color: active ? "#00356B" : "#8a9ab0",
                      fontWeight: active ? 700 : 400,
                      outline: "none",
                      border: "none",
                      borderBottom: active
                        ? "2px solid #00356B"
                        : "2px solid transparent",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {/* Reserves the bold width so selecting a tab doesn't resize
                      the row — and with it the panel. */}
                    <span
                      aria-hidden
                      style={{
                        display: "block",
                        height: 0,
                        overflow: "hidden",
                        visibility: "hidden",
                        fontWeight: 700,
                      }}
                    >
                      {cat.label}
                    </span>
                    {cat.label}
                  </button>
                );
              })}
            </nav>

            {/* Options — scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5">
              {/* HEAD SHAPE */}
              {activeCategory === "head" && (
                <div>
                  <Swatches
                    options={SKIN_TONES.map(
                      (tone) => tone.fill,
                    )}
                    selected={selectedSkin}
                    onSelect={setSelectedSkin}
                  />
                  <ThumbGrid>
                    {FACES.map((markup, i) => (
                      <Thumbnail
                        key={i}
                        selected={selectedFace === i}
                        onClick={() => setSelectedFace(i)}
                      >
                        <Sprite
                          markup={markup}
                          size="100%"
                          colors={faceColors(skin)}
                        />
                      </Thumbnail>
                    ))}
                  </ThumbGrid>
                </div>
              )}

              {/* EYES */}
              {activeCategory === "eyes" && (
                <div>
                  <ThumbGrid>
                    {EYES.map((markup, i) => (
                      <Thumbnail
                        key={i}
                        selected={selectedEye === i}
                        onClick={() =>
                          setSelectedEye(
                            selectedEye === i ? null : i,
                          )
                        }
                      >
                        <Sprite
                          markup={markup}
                          size="100%"
                          fit
                        />
                      </Thumbnail>
                    ))}
                  </ThumbGrid>
                </div>
              )}

              {/* EYEBROWS */}
              {activeCategory === "eyebrows" && (
                <div>
                  <ThumbGrid>
                    {BROWS.map((markup, i) => (
                      <Thumbnail
                        key={i}
                        selected={selectedBrow === i}
                        onClick={() =>
                          setSelectedBrow(
                            selectedBrow === i ? null : i,
                          )
                        }
                      >
                        <Sprite
                          markup={markup}
                          size="100%"
                          fit
                        />
                      </Thumbnail>
                    ))}
                  </ThumbGrid>
                </div>
              )}

              {/* MOUTH */}
              {activeCategory === "mouth" && (
                <div>
                  <ThumbGrid>
                    {MOUTHS.map((markup, i) => (
                      <Thumbnail
                        key={i}
                        selected={selectedMouth === i}
                        onClick={() =>
                          setSelectedMouth(
                            selectedMouth === i ? null : i,
                          )
                        }
                      >
                        <Sprite
                          markup={markup}
                          size="100%"
                          fit
                        />
                      </Thumbnail>
                    ))}
                  </ThumbGrid>
                </div>
              )}

              {/* HAIR */}
              {activeCategory === "hair" && (
                <div>
                  <Swatches
                    options={HAIR_COLORS.map((hc) => hc.fill)}
                    selected={selectedHairColor}
                    onSelect={setSelectedHairColor}
                  />
                  <ThumbGrid>
                    {HAIRS.map((_, i) => (
                      <Thumbnail
                        key={i}
                        selected={selectedHair === i}
                        onClick={() =>
                          setSelectedHair(
                            selectedHair === i ? null : i,
                          )
                        }
                      >
                        <div
                          style={{
                            position: "relative",
                            width: "100%",
                            height: "100%",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                            }}
                          >
                            <HairSprite
                              hairIndex={i}
                              side="back"
                              color={hairColor}
                              size="100%"
                            />
                          </div>
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                            }}
                          >
                            <HairSprite
                              hairIndex={i}
                              side="front"
                              color={hairColor}
                              size="100%"
                            />
                          </div>
                        </div>
                      </Thumbnail>
                    ))}
                  </ThumbGrid>

                  <div className="mt-6">
                    <SectionHeading
                      label="Facial Hair"
                      onClear={
                        selectedFacialHair !== null
                          ? () => setSelectedFacialHair(null)
                          : undefined
                      }
                    />
                    <ThumbGrid>
                      {FACIAL_HAIRS.map((markup, i) => (
                        <Thumbnail
                          key={i}
                          selected={selectedFacialHair === i}
                          onClick={() =>
                            setSelectedFacialHair(
                              selectedFacialHair === i
                                ? null
                                : i,
                            )
                          }
                        >
                          <Sprite
                            markup={markup}
                            size="100%"
                            colors={hairColors(hairColor)}
                            fit
                          />
                        </Thumbnail>
                      ))}
                    </ThumbGrid>
                  </div>
                </div>
              )}

              {/* ACCESSORIES — one slot per type, worn together */}
              {activeCategory === "accessories" && (
                <div className="flex flex-col gap-6">
                  {ACCESSORY_GROUPS.map(({ type, label }) => {
                    const selected = selectedAccessories[type];
                    return (
                      <div key={type}>
                        <SectionHeading
                          label={label}
                          onClear={
                            selected !== undefined
                              ? () => clearAccessory(type)
                              : undefined
                          }
                        />
                        <ThumbGrid>
                          {ACCESSORIES[type].map(
                            (markup, i) => (
                              <Thumbnail
                                key={i}
                                selected={selected === i}
                                onClick={() =>
                                  toggleAccessory(type, i)
                                }
                              >
                                <Sprite
                                  markup={markup}
                                  size="100%"
                                  fit
                                />
                              </Thumbnail>
                            ),
                          )}
                        </ThumbGrid>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* BACKGROUND */}
              {activeCategory === "background" && (
                <div className="flex flex-col gap-6">
                  {BG_SECTIONS.map((section) => (
                    <div key={section.title}>
                      <SectionHeading label={section.title} />
                      <div className="flex flex-wrap gap-3">
                        {section.options.map((option) => {
                          const active = bg.key === option.key;
                          return (
                            <button
                              key={option.key}
                              title={option.label}
                              onClick={() => setBg(option)}
                              className="rounded-xl transition-all duration-100"
                              style={{
                                width: 44,
                                height: 44,
                                background: option.value,
                                border: active
                                  ? "2.5px solid #00356B"
                                  : `2px solid ${BG_SWATCH_BORDER}`,
                                boxShadow: active
                                  ? "0 0 0 2px #00356B"
                                  : "none",
                                outline: "none",
                                cursor: "pointer",
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Export button pinned to bottom-right of panel */}
            <div
              className="shrink-0 flex justify-end px-4 py-3"
              style={{
                borderTop: "1px solid rgba(0,53,107,0.08)",
              }}
            >
              {/* Icon-only, so the name lives in the label and the tooltip. */}
              <button
                onClick={exportPng}
                aria-label="Export PNG"
                title="Export PNG"
                className="flex items-center justify-center rounded-lg transition-all duration-150"
                style={{
                  width: 38,
                  height: 38,
                  background: "#00356B",
                  color: "#ffffff",
                  border: "none",
                  outline: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#002a56")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#00356B")
                }
              >
                <svg
                  aria-hidden
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 4v13" />
                  <path d="M6 11l6 6 6-6" />
                </svg>
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}