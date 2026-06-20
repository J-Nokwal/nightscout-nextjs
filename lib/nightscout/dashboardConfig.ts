import type { LayoutItem } from "react-grid-layout";

export type GridLayoutItem = LayoutItem;

export const ROW_HEIGHT = 20; // px per grid row unit — fine-grained (was 50)

// Bump this whenever DEFAULT_GRID_LAYOUT h/y values change so old saved layouts auto-reset.
const LAYOUT_VERSION = 4;

export const DEFAULT_WIDGET_ORDER = ["bg", "chart", "tir", "active", "pump", "loop", "devage"] as const;

/**
 * Desktop default layout at ROW_HEIGHT=20.
 * Pixel heights: bg=140px, chart=400px, bottom rows≈140px.
 *
 * Row y=27: TIR(6) | Active(3) | Pump(3)
 * Row y=34: Loop(3) | DevAge(4)
 */
export const DEFAULT_GRID_LAYOUT: GridLayoutItem[] = [
  { i: "bg",     x: 0, y: 0,  w: 12, h: 7,  minW: 4, minH: 6  },
  { i: "chart",  x: 0, y: 7,  w: 12, h: 20, minW: 4, minH: 10 },
  { i: "tir",    x: 0, y: 27, w: 6,  h: 7,  minW: 3, minH: 4  },
  { i: "active", x: 6, y: 27, w: 3,  h: 7,  minW: 2, minH: 4  },
  { i: "pump",   x: 9, y: 27, w: 3,  h: 7,  minW: 2, minH: 4  },
  { i: "loop",   x: 0, y: 34, w: 3,  h: 7,  minW: 2, minH: 4  },
  { i: "devage", x: 3, y: 34, w: 4,  h: 7,  minW: 3, minH: 4  },
];

export interface DashboardConfig {
  layoutVersion: number;
  fontFamily:    "system" | "mono";
  gap:           "compact" | "default" | "spacious";
  padding:       "tight" | "default" | "relaxed";
  bgFontSize:    "sm" | "md" | "lg" | "xl";
  bgLayout:      "full" | "compact";
  tirLayout:     "full" | "compact";
  chartHeight:   number;    // px — derived from chart grid cell h
  showBG:        boolean;
  showTIR:       boolean;
  showActive:    boolean;
  showPump:      boolean;
  showLoop:      boolean;
  showDevAge:    boolean;
  showPills:     boolean;
  widgetOrder:   string[];  // legacy order list, kept for export compat
  gridLayout:    GridLayoutItem[];
}

export const DASHBOARD_DEFAULTS: DashboardConfig = {
  layoutVersion: LAYOUT_VERSION,
  fontFamily:    "system",
  gap:           "default",
  padding:       "default",
  bgFontSize:    "lg",
  bgLayout:      "full",
  tirLayout:     "full",
  chartHeight:   320,
  showBG:        true,
  showTIR:       true,
  showActive:    true,
  showPump:      true,
  showLoop:      true,
  showDevAge:    true,
  showPills:     true,
  widgetOrder:   [...DEFAULT_WIDGET_ORDER],
  gridLayout:    DEFAULT_GRID_LAYOUT,
};

const STORAGE_KEY = "ns_dashboard_config";

const OLD_CHART_PX: Record<string, number> = { compact: 220, default: 320, tall: 440 };

export function loadDashboardConfig(): DashboardConfig {
  if (typeof window === "undefined") return DASHBOARD_DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DASHBOARD_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<DashboardConfig> & { chartHeight?: string | number };

    if (typeof parsed.chartHeight === "string") {
      parsed.chartHeight = OLD_CHART_PX[parsed.chartHeight] ?? 320;
    }

    // Any layout version mismatch → reset grid to current default (handles ROW_HEIGHT changes)
    if (!parsed.layoutVersion || parsed.layoutVersion !== LAYOUT_VERSION) {
      parsed.gridLayout    = DEFAULT_GRID_LAYOUT;
      parsed.layoutVersion = LAYOUT_VERSION;
    }

    return { ...DASHBOARD_DEFAULTS, ...parsed };
  } catch {
    return DASHBOARD_DEFAULTS;
  }
}

export function saveDashboardConfig(config: DashboardConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent("ns-dashboard-config"));
}

/** Derive chart height (px) from a grid layout — used to keep GlucoseChart in sync */
export function chartHeightFromLayout(layout: GridLayoutItem[]): number {
  const item = layout.find((i) => i.i === "chart");
  if (!item) return DASHBOARD_DEFAULTS.chartHeight;
  // Subtract focus selector + pills + padding (~80px); BG is now a separate widget
  return Math.max(150, item.h * ROW_HEIGHT - 80);
}

/** Mobile layout: all widgets stacked full-width with correct cumulative y positions */
export function mobileLayout(layout: GridLayoutItem[]): GridLayoutItem[] {
  const sorted = [...layout].sort((a, b) => a.y - b.y || a.x - b.x);
  let y = 0;
  return sorted.map((item) => {
    const result = { ...item, x: 0, y, w: 1 };
    y += item.h;
    return result;
  });
}

// CSS mappings (still used in DashboardGrid)
export const GAP_PX: Record<DashboardConfig["gap"], number> = {
  compact:  8,
  default:  16,
  spacious: 24,
};

export const PADDING_PX: Record<DashboardConfig["padding"], [number, number]> = {
  tight:   [8,  12],
  default: [16, 16],
  relaxed: [24, 24],
};

export const BG_FONT_CLASS: Record<DashboardConfig["bgFontSize"], string> = {
  sm: "text-4xl md:text-5xl",
  md: "text-5xl md:text-6xl",
  lg: "text-5xl md:text-7xl",
  xl: "text-6xl md:text-8xl",
};

// Legacy CSS class maps kept for any remaining consumers
export const GAP_CLASS: Record<DashboardConfig["gap"], string> = {
  compact:  "gap-2",
  default:  "gap-4",
  spacious: "gap-6",
};
export const PADDING_CLASS: Record<DashboardConfig["padding"], string> = {
  tight:   "px-2 py-3 md:px-3 md:py-4",
  default: "px-4 py-4 md:px-6",
  relaxed: "px-6 py-6 md:px-8",
};
