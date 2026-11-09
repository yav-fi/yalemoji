"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { normalizeAppRef } from "@/config/yale-apps";

export function TrafficLogger() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const query = searchParams.toString();
  const loggedRef = useRef<string | null>(null);
  const ref = normalizeAppRef(searchParams.get("ref"));

  useEffect(() => {
    const path = `${pathname}${query ? `?${query}` : ""}`;
    const key = `${path}:${ref}`;
    if (loggedRef.current === key) {
      return;
    }

    loggedRef.current = key;

    void fetch("/api/page-view", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      keepalive: true,
      body: JSON.stringify({ ref, path })
    }).catch(() => {
      // Analytics should never block the landing page.
    });
  }, [ref, pathname, query]);

  return null;
}
