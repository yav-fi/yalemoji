"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { namespaceAvatarSvg, normalizeAvatarSvg } from "@/lib/avatar-svg";
import styles from "./avatar-layer.module.css";

const svgCache = new Map<string, Promise<string>>();

export function loadAvatarSvg(src: string) {
  const cached = svgCache.get(src);
  if (cached) return cached;

  const request = fetch(src).then(async (response) => {
    if (!response.ok) throw new Error(`Could not load avatar layer: ${src}`);
    return normalizeAvatarSvg(src, await response.text());
  });
  svgCache.set(src, request);
  return request;
}

export function AvatarLayer({ fit = false, src }: { fit?: boolean; src: string }) {
  const id = useId().replace(/[^a-z0-9]/gi, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [fittedSvg, setFittedSvg] = useState<{ source: string; markup: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const layerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let active = true;
    setSvg(null);
    setFailed(false);

    loadAvatarSvg(src).then(
      (markup) => {
        if (active) setSvg(namespaceAvatarSvg(markup, id));
      },
      () => {
        if (active) setFailed(true);
      }
    );

    return () => {
      active = false;
    };
  }, [id, src]);

  useLayoutEffect(() => {
    if (!fit || !svg || !layerRef.current) return;
    const element = layerRef.current.querySelector("svg");
    if (!element || typeof element.getBBox !== "function") return;

    try {
      const box = element.getBBox();
      if (!box.width && !box.height) return;
      const side = Math.max(box.width, box.height) * 1.24;
      const fitted = element.cloneNode(true) as SVGSVGElement;
      fitted.setAttribute(
        "viewBox",
        `${box.x + box.width / 2 - side / 2} ${box.y + box.height / 2 - side / 2} ${side} ${side}`
      );
      setFittedSvg({ source: svg, markup: fitted.outerHTML });
    } catch {
      // Browsers can decline to measure an SVG before it reaches layout.
    }
  }, [fit, svg]);

  if (failed) return <span className={styles.error} role="img" aria-label="Avatar layer unavailable" />;
  if (!svg) return <span aria-hidden="true" className={styles.loading} />;

  return (
    <span
      aria-hidden="true"
      className={styles.layer}
      dangerouslySetInnerHTML={{ __html: fit && fittedSvg?.source === svg ? fittedSvg.markup : svg }}
      ref={layerRef}
    />
  );
}
