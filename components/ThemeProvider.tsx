"use client";

import { useEffect } from "react";
import { loadSettings } from "@/lib/nightscout/settings";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const { nightMode } = loadSettings();
    document.documentElement.classList.toggle("dark", nightMode);
  }, []);

  return <>{children}</>;
}
