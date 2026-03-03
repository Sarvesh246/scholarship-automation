"use client";

import { useLayoutEffect } from "react";
import { getInitialTheme, setTheme } from "@/lib/theme";

/**
 * Applies saved theme to document.body on mount so light/dark works even when
 * the inline script does not run (e.g. React not executing script innerHTML).
 */
export function ThemeInit() {
  useLayoutEffect(() => {
    const theme = getInitialTheme();
    setTheme(theme);
  }, []);
  return null;
}
