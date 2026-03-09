"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/stores/themeStore";

export function ThemeProvider({ children }) {
  const theme = useThemeStore((state) => state.theme);
  const initTheme = useThemeStore((state) => state.initTheme);

  useEffect(() => {
    initTheme(theme);
  }, []);

  return children;
}
