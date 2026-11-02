"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const VISITED_KEY = "yalemoji:visited";

export function DeferredHeadingFont() {
  const pathname = usePathname();
  const firstPath = useRef<string | null>(null);
  const returningVisitor = useRef<boolean | null>(null);
  const fontRequested = useRef(false);

  useEffect(() => {
    if (returningVisitor.current === null) {
      firstPath.current = pathname;
      try {
        returningVisitor.current = localStorage.getItem(VISITED_KEY) === "true";
        localStorage.setItem(VISITED_KEY, "true");
      } catch {
        // Navigation still enables the font when browser storage is unavailable.
        returningVisitor.current = false;
      }
    }

    // Keep the first page free of font requests, including in React Strict Mode.
    if ((!returningVisitor.current && pathname === firstPath.current) || fontRequested.current) {
      return;
    }

    let idleCallback: number | undefined;
    let timer: number | undefined;

    async function loadFont() {
      fontRequested.current = true;
      try {
        const font = new FontFace("National Park", "url(/fonts/national-park.ttf)", {
          display: "swap",
          style: "normal",
          weight: "200 800"
        });
        await font.load();
        document.fonts.add(font);
      } catch {
        // Preserve readable fallback text and allow a retry on the next page.
        fontRequested.current = false;
      }
    }

    function scheduleFont() {
      if (typeof window.requestIdleCallback === "function") {
        idleCallback = window.requestIdleCallback(() => void loadFont(), { timeout: 2000 });
      } else {
        timer = window.setTimeout(() => void loadFont(), 0);
      }
    }

    if (document.readyState === "complete") {
      scheduleFont();
    } else {
      window.addEventListener("load", scheduleFont, { once: true });
    }

    return () => {
      window.removeEventListener("load", scheduleFont);
      if (idleCallback !== undefined) window.cancelIdleCallback(idleCallback);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}
