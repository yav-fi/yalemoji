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
