"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  loadDashboardConfig,
  GAP_CLASS,
  PADDING_CLASS,
  DEFAULT_WIDGET_ORDER,
  type DashboardConfig,
} from "@/lib/nightscout/dashboardConfig";

interface ShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: ShellProps) {
  const [cfg, setCfg] = useState<DashboardConfig>(loadDashboardConfig);

  useEffect(() => {
    const handler = () => setCfg(loadDashboardConfig());
    window.addEventListener("ns-dashboard-config", handler);
    return () => window.removeEventListener("ns-dashboard-config", handler);
  }, []);

  return (
    <div
      className={cn(
        "flex flex-col h-full",
        GAP_CLASS[cfg.gap],
        PADDING_CLASS[cfg.padding],
        cfg.fontFamily === "mono" ? "font-mono" : "",
      )}
    >
      {children}
    </div>
  );
}

interface WidgetProps {
  widgetId: string;
  widgetKey?: keyof Pick<DashboardConfig, "showTIR" | "showActive" | "showPump" | "showLoop" | "showDevAge" | "showPills">;
  /** Pass true for the main chart widget so it can grow to fill available space */
  stretch?: boolean;
  children: React.ReactNode;
}

export function DashboardWidget({ widgetId, widgetKey, stretch, children }: WidgetProps) {
  const [order, setOrder] = useState(99);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const update = () => {
      const cfg = loadDashboardConfig();
      const ord = (cfg.widgetOrder ?? DEFAULT_WIDGET_ORDER).indexOf(widgetId);
      setOrder(ord >= 0 ? ord : 99);
      if (widgetKey) setVisible(cfg[widgetKey] as boolean);
    };
    update();
    window.addEventListener("ns-dashboard-config", update);
    return () => window.removeEventListener("ns-dashboard-config", update);
  }, [widgetId, widgetKey]);

  if (!visible) return null;
  return (
    <div
      style={{ order }}
      className={stretch ? "flex flex-col flex-1 min-h-0" : undefined}
    >
      {children}
    </div>
  );
}
