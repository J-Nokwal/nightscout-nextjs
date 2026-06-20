export type BgMode   = "black" | "dark" | "solid" | "alarm";
export type TextMode = "alarm" | "solid" | "white" | "green";
export type FontFamily = "sans" | "mono" | "serif";
export type ClockLayout = "center" | "bg-top" | "clock-top";

export interface CustomClockConfig {
  bgMode:         BgMode;
  bgColor:        string;   // hex, used when bgMode === "solid"
  textMode:       TextMode;
  textColor:      string;   // hex, used when textMode === "solid"
  fontFamily:     FontFamily;
  bgFontSize:     number;   // vw
  arrowFontSize:  number;   // vw
  deltaFontSize:  number;   // vw
  clockFontSize:  number;   // vw
  layout:         ClockLayout;
  showBG:         boolean;
  showArrow:      boolean;
  showDelta:      boolean;
  showClock:      boolean;
  showDate:       boolean;
  showUnit:       boolean;
  showAgo:        boolean;
  showStale:      boolean;
}

export const DEFAULT_CUSTOM_CLOCK: CustomClockConfig = {
  bgMode:        "black",
  bgColor:       "#0f172a",
  textMode:      "alarm",
  textColor:     "#22c55e",
  fontFamily:    "sans",
  bgFontSize:    20,
  arrowFontSize: 10,
  deltaFontSize: 5,
  clockFontSize: 7,
  layout:        "center",
  showBG:        true,
  showArrow:     true,
  showDelta:     true,
  showClock:     true,
  showDate:      false,
  showUnit:      true,
  showAgo:       true,
  showStale:     true,
};

const KEY = "ns_custom_clock";

export function loadClockConfig(): CustomClockConfig {
  if (typeof window === "undefined") return DEFAULT_CUSTOM_CLOCK;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_CUSTOM_CLOCK;
    return { ...DEFAULT_CUSTOM_CLOCK, ...JSON.parse(raw) };
  } catch { return DEFAULT_CUSTOM_CLOCK; }
}

export function saveClockConfig(c: CustomClockConfig) {
  localStorage.setItem(KEY, JSON.stringify(c));
}

// Alarm-level derived colors
const ALARM_BG_COLORS: Record<string, string> = {
  "urgent-low":  "#450a0a",
  low:           "#431407",
  normal:        "#052e16",
  high:          "#422006",
  "urgent-high": "#4a1a00",
  stale:         "#0c0a09",
};
const ALARM_TEXT_COLORS: Record<string, string> = {
  "urgent-low":  "#f87171",
  low:           "#fb923c",
  normal:        "#4ade80",
  high:          "#facc15",
  "urgent-high": "#f87171",
  stale:         "#6b7280",
};

export function resolveBackground(config: CustomClockConfig, level: string): string {
  if (config.bgMode === "alarm") return ALARM_BG_COLORS[level] ?? ALARM_BG_COLORS.normal;
  if (config.bgMode === "solid") return config.bgColor;
  if (config.bgMode === "dark")  return "#111827";
  return "#000000";
}

export function resolveTextColor(config: CustomClockConfig, level: string): string {
  if (config.textMode === "alarm") return ALARM_TEXT_COLORS[level] ?? ALARM_TEXT_COLORS.normal;
  if (config.textMode === "solid") return config.textColor;
  if (config.textMode === "green") return "#4ade80";
  return "#ffffff";
}

export const FONT_FAMILY_CLASS: Record<FontFamily, string> = {
  sans:  "font-sans",
  mono:  "font-mono",
  serif: "font-serif",
};
