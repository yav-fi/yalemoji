"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { applyTheme } from "@/lib/theme";

export function ThemeUrlSync() {
  const pathname = usePathname();
  const mode = useSearchParams().get("mode");

  useEffect(() => {
    if (mode !== null) applyTheme(mode === "dark" ? "dark" : "light");
  }, [mode, pathname]);

  return null;
}
