"use client";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveGridLayout,
  useContainerWidth,
  verticalCompactor,
} from "react-grid-layout";
import type { LayoutItem, Layout, ResponsiveLayouts } from "react-grid-layout";
import { GripHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  loadDashboardConfig,
  DEFAULT_GRID_LAYOUT,
  GAP_PX,
  PADDING_PX,
  ROW_HEIGHT,
  mobileLayout,
  type DashboardConfig,
  type GridLayoutItem,
} from "@/lib/nightscout/dashboardConfig";

const WIDGET_LABELS: Record<string, string> = {
  bg:     "BG Reading",
  chart:  "Glucose Chart",
  tir:    "Time in Range",
  active: "Active (IOB / COB)",
  pump:   "Pump",
  loop:   "Loop / Phone",
  devage: "Device Age",
};

// ── Edit-mode frame around each widget ───────────────────────────────────────

function EditFrame({
  id,
  children,
  onRemove,
}: {
  id: string;
  children: React.ReactNode;
  onRemove?: (id: string) => void;
}) {
  return (
    <div className="flex flex-col h-full rounded-xl border-2 border-primary/30 bg-card shadow-md overflow-hidden">
      <div className="rgl-drag-handle flex items-center gap-2 px-3 py-2 bg-primary/5 border-b border-primary/20 cursor-grab active:cursor-grabbing select-none shrink-0">
        <GripHorizontal size={14} className="text-primary/60" />
        <span className="text-xs font-medium text-primary/80 flex-1">
          {WIDGET_LABELS[id] ?? id}
        </span>
        <span className="text-[10px] text-primary/40 hidden sm:block">drag · resize ↘</span>
        {onRemove && id !== "bg" && id !== "chart" && (
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => onRemove(id)}
            className="ml-1 p-0.5 rounded hover:bg-destructive/10 text-primary/40 hover:text-destructive transition-colors"
            title="Hide widget"
          >
            <X size={12} />
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none pointer-events-none select-none">
        {children}
      </div>
    </div>
  );
}

// ── DashboardGrid ─────────────────────────────────────────────────────────────

export interface DashboardGridProps {
  widgets: Record<string, React.ReactNode>;
  editMode?: boolean;
  layout?: GridLayoutItem[];
  cfg?: DashboardConfig;
  onLayoutChange?: (layout: GridLayoutItem[]) => void;
  onToggleWidget?: (id: string) => void;
}

export function DashboardGrid({
  widgets,
  editMode = false,
  layout: externalLayout,
  cfg: externalCfg,
  onLayoutChange,
  onToggleWidget,
}: DashboardGridProps) {
  const [internalCfg, setInternalCfg] = useState<DashboardConfig>(loadDashboardConfig);
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });

  useEffect(() => {
    const handler = () => setInternalCfg(loadDashboardConfig());
    window.addEventListener("ns-dashboard-config", handler);
    return () => window.removeEventListener("ns-dashboard-config", handler);
  }, []);

  const cfg            = externalCfg ?? internalCfg;
  const desktopLayout  = (externalLayout ?? cfg.gridLayout ?? DEFAULT_GRID_LAYOUT) as LayoutItem[];
  const gap            = GAP_PX[cfg.gap];
  const padding        = PADDING_PX[cfg.padding];

  // Visibility filter — memoized so RGL sees stable array references between renders
  const visibleItems = useMemo(() => desktopLayout.filter((item) => {
    if (item.i === "bg"     && cfg.showBG     === false) return false;
    if (item.i === "tir"    && !cfg.showTIR)             return false;
    if (item.i === "active" && !cfg.showActive)          return false;
    if (item.i === "pump"   && !cfg.showPump)            return false;
    if (item.i === "loop"   && !cfg.showLoop)            return false;
    if (item.i === "devage" && !cfg.showDevAge)          return false;
    return item.i in widgets;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [desktopLayout, cfg.showBG, cfg.showTIR, cfg.showActive, cfg.showPump, cfg.showLoop, cfg.showDevAge]);

  const mobileItems = useMemo(() => mobileLayout(visibleItems) as LayoutItem[], [visibleItems]);

  const layouts = useMemo<ResponsiveLayouts>(() => ({
    lg: visibleItems as Layout,
    xs: mobileItems  as Layout,
  }), [visibleItems, mobileItems]);

  function handleChange(current: Layout, allLayouts: ResponsiveLayouts) {
    if (!onLayoutChange || !allLayouts.lg) return;
    // Update positions for currently visible items
    const updated = new Map(
      (allLayouts.lg as LayoutItem[]).map((item) => {
        const orig = desktopLayout.find((o) => o.i === item.i);
        return [item.i, orig ? { ...orig, x: item.x, y: item.y, w: item.w, h: item.h } : item];
      })
    );
    // Re-merge with full desktopLayout so hidden items keep their stored positions
    const full = desktopLayout.map((orig) => updated.get(orig.i) ?? orig);
    // Bail if nothing actually changed — prevents infinite loop when RGL fires on mount/re-render
    const changed = full.some((item) => {
      const orig = desktopLayout.find((o) => o.i === item.i);
      return !orig || item.x !== orig.x || item.y !== orig.y || item.w !== orig.w || item.h !== orig.h;
    });
    if (!changed) return;
    onLayoutChange(full as GridLayoutItem[]);
  }

  return (
    <div
      ref={containerRef}
      className={cn(cfg.fontFamily === "mono" ? "font-mono" : "")}
    >
      {mounted && (
        <ResponsiveGridLayout
          width={width}
          layouts={layouts}
          breakpoints={{ lg: 768, xs: 0 }}
          cols={{ lg: 12, xs: 1 }}
          rowHeight={ROW_HEIGHT}
          dragConfig={editMode ? { handle: ".rgl-drag-handle" } : { enabled: false }}
          resizeConfig={editMode ? { handles: ["se", "s"] as readonly ["se", "s"] } : { enabled: false }}
          margin={[gap, gap] as readonly [number, number]}
          containerPadding={padding as readonly [number, number]}
          compactor={verticalCompactor}
          onLayoutChange={handleChange}
        >
          {visibleItems.map((item) => (
            <div key={item.i}>
              {editMode ? (
                <EditFrame id={item.i} onRemove={onToggleWidget}>
                  {widgets[item.i]}
                </EditFrame>
              ) : (
                <div className="h-full overflow-y-auto scrollbar-none">{widgets[item.i]}</div>
              )}
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}

// ── Auto-loading grid for the dashboard page ──────────────────────────────────

export function AutoDashboardGrid({ widgets }: { widgets: Record<string, React.ReactNode> }) {
  const [cfg, setCfg] = useState<DashboardConfig>(loadDashboardConfig);

  useEffect(() => {
    const handler = () => setCfg(loadDashboardConfig());
    window.addEventListener("ns-dashboard-config", handler);
    return () => window.removeEventListener("ns-dashboard-config", handler);
  }, []);

  return <DashboardGrid widgets={widgets} cfg={cfg} />;
}
