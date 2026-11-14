import type { AvatarPalette } from "@/config/avatar-palettes";

export function normalizeAvatarSvg(src: string, markup: string) {
  const transparent = markup.replace(
    /<rect\s+width="502"\s+height="502"\s+fill="white"\s*\/>/i,
    ""
  );

  if (src.startsWith("/yalemoji/Face/")) {
    return transparent
      .replace(/#c4c4c4/gi, "var(--avatar-primary)")
      .replace(/#676767/gi, "var(--avatar-secondary)");
  }

  if (src === "/yalemoji/Nose 1.svg") {
    return transparent.replace(/#676767/gi, "var(--avatar-secondary)");
  }

  if (
    src.startsWith("/yalemoji/Hairs/") ||
    src.startsWith("/yalemoji/FacialHair/")
  ) {
    return transparent
      .replace(/#(?:515151|676767)/gi, "var(--avatar-primary)")
      .replace(/\bblack\b/gi, "var(--avatar-secondary)");
  }

  return transparent;
}

export function namespaceAvatarSvg(markup: string, namespace: string) {
  const ids = [...markup.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
  return ids.reduce(
    (current, id) =>
      current
        .split(`id="${id}"`)
        .join(`id="${id}-${namespace}"`)
        .split(`url(#${id})`)
        .join(`url(#${id}-${namespace})`)
        .split(`href="#${id}"`)
        .join(`href="#${id}-${namespace}"`),
    markup
  );
}

export function replacePaletteVariables(
  markup: string,
  palette: AvatarPalette | undefined
) {
  if (!palette) return markup;
  return markup
    .replaceAll("var(--avatar-primary)", palette.primary)
    .replaceAll("var(--avatar-secondary)", palette.secondary);
}

export function innerSvg(markup: string) {
  return markup
    .replace(/[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>[\s\S]*/, "")
    .trim();
}

// A luminance mask keeps the accessory visible outside the face silhouette.
// SourceAlpha includes both face fills and outlines, regardless of palette.
export function occludeAvatarSvg(markup: string, occluder: string, offsetY = 0) {
  const maskId = "avatar-face-mask";
  const filterId = "avatar-face-silhouette";
  const body = innerSvg(markup);
  const positionedBody = offsetY ? `<g transform="translate(0 ${offsetY})">${body}</g>` : body;
  const face = innerSvg(namespaceAvatarSvg(replacePaletteVariables(occluder, { id: "mask", primary: "#000000", secondary: "#000000" }), "occluder"));
  return markup.replace(body, `<defs>
    <filter id="${filterId}" filterUnits="userSpaceOnUse" x="0" y="0" width="502" height="502">
      <feFlood flood-color="black"/>
      <feComposite in2="SourceAlpha" operator="in"/>
    </filter>
    <mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="502" height="502" style="mask-type:luminance">
      <rect width="502" height="502" fill="white"/>
      <g filter="url(#${filterId})">${face}</g>
    </mask>
  </defs><g mask="url(#${maskId})">${positionedBody}</g>`);
}
