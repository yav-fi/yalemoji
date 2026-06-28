"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

export function TrafficLogger() {
  const searchParams = useSearchParams();
  const loggedRef = useRef<string | null>(null);
  const ref = searchParams.get("ref")?.trim() || "none";

  useEffect(() => {
    if (loggedRef.current === ref) {
      return;
    }

    loggedRef.current = ref;
    const path = `${window.location.pathname}${window.location.search}`;

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
  }, [ref]);

  return null;
}
