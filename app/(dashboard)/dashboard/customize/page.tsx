"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  loadDashboardConfig,
  saveDashboardConfig,
  DASHBOARD_DEFAULTS,
  DEFAULT_GRID_LAYOUT,
  BG_FONT_CLASS,
  chartHeightFromLayout,
  type DashboardConfig,
  type GridLayoutItem,
} from "@/lib/nightscout/dashboardConfig";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { BGWidget } from "@/components/dashboard/BGWidget";
import { ChartWidget } from "@/components/dashboard/ChartWidget";
import { TIRWidget } from "@/components/dashboard/TIRWidget";
import {
  ActiveWidget,
  PumpWidget,
  LoopWidget,
  DeviceAgeWidget,
} from "@/components/dashboard/DeviceStatus";
import { calcIOB } from "@/lib/nightscout/iob";
import { ArrowLeft, Check, RotateCcw, Smartphone, Tablet, Monitor } from "lucide-react";
import type { Entry, Treatment, DeviceStatus, Profile } from "@/types/nightscout";

// ── Data ──────────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ── Device presets (content-area widths, no scaling) ─────────────────────────

const DEVICES = {
  mobile:  { label: "Mobile",  maxWidth: "max-w-[375px]",  Icon: Smartphone },
  tablet:  { label: "Tablet",  maxWidth: "max-w-[768px]",  Icon: Tablet },
  desktop: { label: "Desktop", maxWidth: "max-w-full",      Icon: Monitor },
} as const;
type DeviceKey = keyof typeof DEVICES;

// ── Settings helpers ──────────────────────────────────────────────────────────

function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg border text-sm transition-all",
              o.value === value
                ? "bg-primary text-primary-foreground border-primary font-medium"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40",
            )}
          >
            {o.value === value && <Check size={11} className="inline mr-1 -mt-0.5" />}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CustomizeDashboardPage() {
  const router = useRouter();
  const [cfg, setCfg] = useState<DashboardConfig>(loadDashboardConfig);
  const [device, setDevice] = useState<DeviceKey>("desktop");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Real data for the preview
  const { data: entries = [] }    = useSWR<Entry[]>("/api/v3/entries?count=288", fetcher, { refreshInterval: 0 });
  const { data: treatments = [] } = useSWR<Treatment[]>("/api/v3/treatments?count=100", fetcher, { refreshInterval: 0 });
  const { data: statuses = [] }   = useSWR<DeviceStatus[]>("/api/v3/devicestatus?count=1", fetcher, { refreshInterval: 0 });
  const { data: profiles = [] }   = useSWR<Profile[]>("/api/v3/profiles", fetcher, { refreshInterval: 0 });

  // Profile values
  const profile      = profiles[0];
  const storeName    = profile?.defaultProfile ?? "Default";
  const store        = profile?.store?.[storeName];
  const dia          = store?.dia ?? 6;
  const carbsPerHour = store?.carbs_hr ?? 20;
  const nowSec       = new Date().getHours() * 3600 + new Date().getMinutes() * 60;

  function currentVal(sched: { timeAsSeconds: number; value: number }[] | undefined) {
    if (!sched?.length) return undefined;
    const s = [...sched].sort((a, b) => a.timeAsSeconds - b.timeAsSeconds);
    return [...s].reverse().find((e) => e.timeAsSeconds <= nowSec)?.value ?? s[0].value;
  }

  const isf           = currentVal(store?.sens) ?? 50;
  const carbRatio     = currentVal(store?.carbratio) ?? 10;
  const targetBG      = store?.target_low?.length
    ? Math.round(((currentVal(store.target_low) ?? 80) + (currentVal(store.target_high) ?? 140)) / 2)
    : 110;
  const scheduledBasal = currentVal(store?.basal);
  const { iob }        = calcIOB(treatments, dia);

  // Auto-save + broadcast on every cfg change
  useEffect(() => {
    saveDashboardConfig(cfg);
  }, [cfg]);

  function update<K extends keyof DashboardConfig>(key: K, value: DashboardConfig[K]) {
    setCfg((c) => ({ ...c, [key]: value }));
  }

  function handleLayoutChange(newLayout: GridLayoutItem[]) {
    const newChartHeight = chartHeightFromLayout(newLayout);
    setCfg((c) => ({ ...c, gridLayout: newLayout, chartHeight: newChartHeight }));
  }

  function handleToggleWidget(id: string) {
    if (id === "bg")     update("showBG",     !(cfg.showBG ?? true));
    if (id === "tir")    update("showTIR",    !cfg.showTIR);
    if (id === "active") update("showActive", !cfg.showActive);
    if (id === "pump")   update("showPump",   !cfg.showPump);
    if (id === "loop")   update("showLoop",   !cfg.showLoop);
    if (id === "devage") update("showDevAge", !cfg.showDevAge);
  }

  function reset() {
    setCfg({ ...DASHBOARD_DEFAULTS, gridLayout: DEFAULT_GRID_LAYOUT });
  }

  // Widgets dict — same components used on the real dashboard
  const widgets: Record<string, React.ReactNode> = {
    bg: (
      <BGWidget
        initialEntries={entries}
        initialTreatments={treatments}
        iob={iob}
        isf={isf}
        carbRatio={carbRatio}
        targetBG={targetBG}
      />
    ),
    chart: (
      <ChartWidget
        initialEntries={entries}
        initialTreatments={treatments}
        basalSchedule={store?.basal}
        iob={iob}
      />
    ),
    tir: (
      <TIRWidget
        entries={entries}
        thresholds={{ urgentLow: 54, low: 70, high: 180, urgentHigh: 250 }}
      />
    ),
    active: (
      <ActiveWidget
        initialTreatments={treatments}
        dia={dia}
        carbsPerHour={carbsPerHour}
      />
    ),
    pump: (
      <PumpWidget
        initialStatuses={statuses}
        initialTreatments={treatments}
        scheduledBasal={scheduledBasal}
      />
    ),
    loop: (
      <LoopWidget initialStatuses={statuses} />
    ),
    devage: (
      <DeviceAgeWidget initialTreatments={treatments} />
    ),
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background shrink-0">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold">Customize Home Screen</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Drag to rearrange · resize from corners · changes apply live
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reset} className="gap-1.5 shrink-0">
          <RotateCcw size={13} /> Reset
        </Button>
        <Button size="sm" onClick={() => router.back()} className="shrink-0">Done</Button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">

        {/* ── Left: Settings ── */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-border overflow-y-auto bg-background">
          <div className="p-4 space-y-5">

            <Chips
              label="BG Number Size"
              value={cfg.bgFontSize}
              onChange={(v) => update("bgFontSize", v)}
              options={[
                { value: "sm", label: "Small" },
                { value: "md", label: "Medium" },
                { value: "lg", label: "Large" },
                { value: "xl", label: "XL" },
              ]}
            />

            {/* Live font size preview */}
            <div className="flex items-baseline gap-2 bg-green-600 text-white rounded-xl px-4 py-2 w-fit">
              <span className={cn("font-bold tabular-nums leading-none", BG_FONT_CLASS[cfg.bgFontSize])}>126</span>
              <span className="text-sm opacity-80">mg/dL</span>
            </div>

            <Chips
              label="Font Style"
              value={cfg.fontFamily}
              onChange={(v) => update("fontFamily", v)}
              options={[
                { value: "system", label: "Default" },
                { value: "mono",   label: "Monospace" },
              ]}
            />

            <Chips
              label="Widget Spacing"
              value={cfg.gap}
              onChange={(v) => update("gap", v)}
              options={[
                { value: "compact",  label: "Compact" },
                { value: "default",  label: "Default" },
                { value: "spacious", label: "Spacious" },
              ]}
            />

            <Chips
              label="Page Padding"
              value={cfg.padding}
              onChange={(v) => update("padding", v)}
              options={[
                { value: "tight",   label: "Tight" },
                { value: "default", label: "Default" },
                { value: "relaxed", label: "Relaxed" },
              ]}
            />

            <Chips
              label="BG Widget Style"
              value={cfg.bgLayout}
              onChange={(v) => update("bgLayout", v)}
              options={[
                { value: "full",    label: "Full" },
                { value: "compact", label: "Compact" },
              ]}
            />

            <Chips
              label="TIR Widget Style"
              value={cfg.tirLayout}
              onChange={(v) => update("tirLayout", v)}
              options={[
                { value: "full",    label: "Full" },
                { value: "compact", label: "Compact" },
              ]}
            />

            {/* Widget visibility */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Widgets</p>
              {[
                { key: "showTIR"    as const, label: "Time in Range" },
                { key: "showActive" as const, label: "Active (IOB / COB)" },
                { key: "showPump"   as const, label: "Pump" },
                { key: "showLoop"   as const, label: "Loop / Phone" },
                { key: "showDevAge" as const, label: "Device Age" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
                  <span className="text-sm">{label}</span>
                  <Switch
                    checked={cfg[key] as boolean}
                    onCheckedChange={(v) => update(key, v)}
                  />
                </div>
              ))}
            </div>

            <div className="text-xs text-muted-foreground border-t border-border/50 pt-3 space-y-1">
              <p className="font-medium">Layout tips:</p>
              <p>• Drag the <strong>⠿</strong> handle bar to move a widget</p>
              <p>• Drag the <strong>↘</strong> corner to resize</p>
              <p>• Put TIR and Device Status side by side horizontally</p>
            </div>

            <p className="text-xs text-muted-foreground pb-2">Settings stored locally in your browser.</p>
          </div>
        </div>

        {/* ── Right: Live editable preview ── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-muted/20">
          {isMobile ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 py-10 text-center">
              <Monitor size={40} className="text-muted-foreground/50" />
              <div className="space-y-1.5">
                <p className="font-semibold text-sm">Layout editor unavailable on mobile</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Widget drag-and-resize is designed for desktop and tablet screens.
                  Open this page on a wider screen to rearrange your home layout.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Device switcher */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-background shrink-0">
                <span className="text-xs text-muted-foreground font-medium">Preview width:</span>
                {(Object.entries(DEVICES) as [DeviceKey, typeof DEVICES[DeviceKey]][]).map(([key, d]) => (
                  <button
                    key={key}
                    onClick={() => setDevice(key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all",
                      key === device
                        ? "bg-primary text-primary-foreground border-primary font-medium"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
                    )}
                  >
                    <d.Icon size={14} />
                    {d.label}
                  </button>
                ))}
              </div>

              {/* Editable grid — constrained by device width, full-size (no scaling) */}
              <div className="flex-1 overflow-auto">
                <div className={cn("mx-auto bg-background min-h-full", DEVICES[device].maxWidth)}>
                  <DashboardGrid
                    widgets={widgets}
                    editMode
                    layout={cfg.gridLayout}
                    cfg={cfg}
                    onLayoutChange={handleLayoutChange}
                    onToggleWidget={handleToggleWidget}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
