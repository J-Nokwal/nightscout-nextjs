"use client";

import { useState, useEffect } from "react";

export function useIsDark(): boolean {
  const [dark, setDark] = useState(
    () => typeof window !== "undefined" && document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setDark(el.classList.contains("dark")));
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export interface ChartTheme {
  isDark: boolean;
  tickColor: string;
  gridColor: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  tooltipStyle: React.CSSProperties;
}

export function useChartTheme(): ChartTheme {
  const isDark = useIsDark();
  const tickColor    = isDark ? "#9ca3af" : "#6b7280";
  const gridColor    = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const tooltipBg    = isDark ? "#1f2937" : "#ffffff";
  const tooltipBorder = isDark ? "#374151" : "#e5e7eb";
  const tooltipText  = isDark ? "#f9fafb" : "#111827";
  return {
    isDark, tickColor, gridColor, tooltipBg, tooltipBorder, tooltipText,
    tooltipStyle: {
      background: tooltipBg,
      border: `1px solid ${tooltipBorder}`,
      borderRadius: 8,
      fontSize: 11,
      color: tooltipText,
      boxShadow: isDark
        ? "0 4px 12px rgba(0,0,0,0.5)"
        : "0 2px 8px rgba(0,0,0,0.12)",
    },
  };
}
