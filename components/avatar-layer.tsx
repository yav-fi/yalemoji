"use client";

import { useEffect, useState } from "react";
import styles from "./avatar-layer.module.css";

const svgCache = new Map<string, Promise<string>>();

export function normalizeAvatarSvg(src: string, markup: string) {
  const transparent = markup.replace(
    /<rect\s+width="502"\s+height="502"\s+fill="white"\s*\/>/i,
    ""
  );

  if (src.startsWith("/avatar/face/")) {
    return transparent
      .replace(/#c4c4c4/gi, "var(--avatar-primary)")
      .replace(/#676767/gi, "var(--avatar-secondary)");
  }

  if (src.startsWith("/avatar/nose/")) {
    return transparent.replace(/#676767/gi, "var(--avatar-secondary)");
  }

  if (src.startsWith("/avatar/hair-front/") || src.startsWith("/avatar/hair-back/")) {
    return transparent
      .replace(/#(?:515151|676767)/gi, "var(--avatar-primary)")
      .replace(/\bblack\b/gi, "var(--avatar-secondary)");
  }

  return transparent;
}

function loadSvg(src: string) {
  const cached = svgCache.get(src);
  if (cached) return cached;

  const request = fetch(src).then(async (response) => {
    if (!response.ok) throw new Error(`Could not load avatar layer: ${src}`);
    return normalizeAvatarSvg(src, await response.text());
  });
  svgCache.set(src, request);
  return request;
}

export function AvatarLayer({ src }: { src: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setSvg(null);
    setFailed(false);

    loadSvg(src).then(
      (markup) => {
        if (active) setSvg(markup);
      },
      () => {
        if (active) setFailed(true);
      }
    );

    return () => {
      active = false;
    };
  }, [src]);

  if (failed) return <span className={styles.error} role="img" aria-label="Avatar layer unavailable" />;
  if (!svg) return <span aria-hidden="true" className={styles.loading} />;

  return <span aria-hidden="true" className={styles.layer} dangerouslySetInnerHTML={{ __html: svg }} />;
}
