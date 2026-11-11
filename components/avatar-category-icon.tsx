"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { avatarOptions, type AvatarCategory } from "@/config/avatar-options";
import { innerSvg, namespaceAvatarSvg, replacePaletteVariables } from "@/lib/avatar-svg";
import { loadAvatarSvg } from "./avatar-layer";

export function AvatarCategoryIcon({ category }: { category: AvatarCategory }) {
  const id = useId().replace(/[^a-z0-9]/gi, "");
  const filterId = `category-silhouette-${id}`;
  const artworkRef = useRef<SVGGElement>(null);
  const [artwork, setArtwork] = useState<{ category: AvatarCategory; markup: string } | null>(null);
  const [bounds, setBounds] = useState<{ markup: string; viewBox: string } | null>(null);
  const markup = artwork?.category === category ? artwork.markup : "";

  useEffect(() => {
    if (category === "background") return;
    let active = true;
    const option = avatarOptions[category][0];
    const sources = category === "hair"
      ? [option.backSrc, option.frontSrc ?? option.src].filter((src): src is NonNullable<typeof src> => Boolean(src))
      : [option.src];
    Promise.all(sources.map(loadAvatarSvg)).then((layers) => {
      if (active) setArtwork({ category, markup: layers.map((svg, index) =>
        innerSvg(namespaceAvatarSvg(replacePaletteVariables(svg, { id: "silhouette", primary: "#000000", secondary: "#000000" }), `${id}-${index}`))).join("") });
    }).catch(() => { /* Leave the decorative icon empty if its artwork cannot load. */ });
    return () => { active = false; };
  }, [category, id]);

  useLayoutEffect(() => {
    const group = artworkRef.current;
    if (!markup || !group || typeof group.getBBox !== "function") return;
    const box = group.getBBox();
    if (!box.width || !box.height) return;
    // Fit the actual feature, not its full avatar canvas, into the same icon box.
    const side = Math.max(box.width, box.height) * 1.12;
    setBounds({ markup, viewBox: `${box.x + (box.width - side) / 2} ${box.y + (box.height - side) / 2} ${side} ${side}` });
  }, [markup]);

  if (category === "background") {
    return (
      <svg aria-hidden="true" fill="none" width="26" height="26" viewBox="0 0 24 24"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3h18v18H3ZM3 17l6-6 4 4 3-3 5 5M17 7h.01" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" width="26" height="26" fill="none"
      viewBox={bounds?.markup === markup ? bounds.viewBox : "0 0 502 502"}>
      <defs>
        <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feFlood floodColor="currentColor" />
          <feComposite in2="SourceAlpha" operator="in" />
        </filter>
      </defs>
      <g ref={artworkRef} filter={`url(#${filterId})`} dangerouslySetInnerHTML={{ __html: markup }} />
    </svg>
  );
}
