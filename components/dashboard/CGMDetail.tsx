"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlucoseChart } from "@/components/charts/GlucoseChart";
import { BolusCalcButton } from "@/components/dashboard/BolusCalc";
import { calcDelta } from "@/lib/nightscout/delta";
import { ar2Forecast } from "@/lib/nightscout/ar2";
import { timeAgo, isStale } from "@/lib/nightscout/timeago";
import { getAlarmLevel, checkPredictiveAlarm, DIRECTION_ARROWS } from "@/lib/nightscout/alarms";
import { AnnouncementBanner } from "@/components/dashboard/AnnouncementBanner";
import { formatGlucose } from "@/lib/nightscout/units";
import { playAlarm } from "@/lib/nightscout/alarmAudio";
import { loadSettings } from "@/lib/nightscout/settings";
import { sendAlarmNotification } from "@/app/actions/notify";
import { requestNotificationPermission, showBrowserNotification, speakText } from "@/lib/nightscout/browserNotify";
import { calcCOB } from "@/lib/nightscout/cob";
import { useRealtimeUpdates } from "@/lib/sse/useRealtimeUpdates";
import { buildBasalTimeline } from "@/lib/nightscout/basal";
import { loadDashboardConfig, BG_FONT_CLASS } from "@/lib/nightscout/dashboardConfig";
import type { Entry, Treatment, DeviceStatus, ProfileStore } from "@/types/nightscout";
import type { GlucoseUnit } from "@/lib/nightscout/units";
import type { GlucoseThresholds } from "@/lib/nightscout/alarms";
import { BellOff } from "lucide-react";

interface Props {
  initialEntries: Entry[];
  initialTreatments?: Treatment[];
  basalSchedule?: ProfileStore["basal"];
  unit?: GlucoseUnit;
  iob?: number;
  isf?: number;
  carbRatio?: number;
  targetBG?: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ALARM_BG: Record<string, string> = {
  "urgent-low":  "bg-red-700 text-white",
  low:           "bg-orange-500 text-white",
  normal:        "bg-green-600 text-white",
  high:          "bg-yellow-500 text-black",
  "urgent-high": "bg-red-500 text-white",
};

const ALARM_LABEL: Record<string, string> = {
  "urgent-low":  "URGENT LOW",
  low:           "LOW",
  normal:        "IN RANGE",
  high:          "HIGH",
  "urgent-high": "URGENT HIGH",
};

const FOCUS_HOURS_OPTIONS = [0.25, 0.5, 1, 2, 3, 4, 6, 12, 24];

function formatFocusLabel(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h}h`;
}

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function CGMDetail({ initialEntries, initialTreatments = [], basalSchedule, unit: propUnit, iob = 0, isf = 50, carbRatio = 10, targetBG = 100 }: Props) {
  const [settings] = useState(() => loadSettings());
  const [dashCfg, setDashCfg] = useState(() => loadDashboardConfig());
  const unit: GlucoseUnit = propUnit ?? settings.unit;

  // Re-read dashboard config when user saves customizer
  useEffect(() => {
    const handler = () => setDashCfg(loadDashboardConfig());
    window.addEventListener("ns-dashboard-config", handler);
    return () => window.removeEventListener("ns-dashboard-config", handler);
  }, []);
  const [focusHours, setFocusHours] = useState(3);
  const [hovered, setHovered] = useState<{ mills: number; sgv: number } | null>(null);

  // Request browser notification permission once on mount
  useEffect(() => { requestNotificationPermission(); }, []);

  // Real-time updates via SSE — revalidates SWR caches instantly on new data
  useRealtimeUpdates();

  const { data: entries = initialEntries } = useSWR<Entry[]>(
    "/api/v3/entries?count=288",
    fetcher,
    { refreshInterval: 60_000, fallbackData: initialEntries }
  );
  const { data: treatments = initialTreatments } = useSWR<Treatment[]>(
    "/api/v3/treatments?count=50",
    fetcher,
    { refreshInterval: 60_000, fallbackData: initialTreatments }
  );
  const { data: statuses = [] } = useSWR<DeviceStatus[]>(
    "/api/v3/devicestatus?count=1",
    fetcher,
    { refreshInterval: 60_000 }
  );

  const now = useNow();
  const cob = calcCOB(treatments, settings.carbsPerHour, now);
  const sorted = [...entries].filter((e) => e.sgv).sort((a, b) => b.date - a.date);
  const latest = sorted[0];

  // Loop/OpenAPS predictions from latest device status
  const rawLoopPred = statuses[0]?.loop?.predicted;
  const loopPredicted = rawLoopPred?.startDate && rawLoopPred?.values
    ? { startDate: rawLoopPred.startDate, values: rawLoopPred.values }
    : null;

  // Basal rate timeline — scoped to the currently selected focus window
  const chartFrom = now - focusHours * 3600_000;
  const basalTimeline = basalSchedule?.length
    ? buildBasalTimeline(
        { basal: basalSchedule } as import("@/types/nightscout").ProfileStore,
        treatments,
        chartFrom,
        now
      )
    : [];

  const thresholds: GlucoseThresholds = {
    urgentLow:  settings.urgentLow,
    low:        settings.low,
    high:       settings.high,
    urgentHigh: settings.urgentHigh,
  };

  const delta    = calcDelta(sorted);
  const alarm    = latest ? getAlarmLevel(latest, thresholds) : "normal";
  const stale    = latest ? isStale(latest.date, now) : true;
  const ago      = latest ? timeAgo(latest.date, now) : "---";
  const forecast = latest && delta
    ? ar2Forecast(latest.sgv!, delta.mean5MinsAgo, latest.date)
    : null;

  // Predictive alarm — fires when current reading is in range but AR2 predicts a breach
  const predictive = alarm === "normal" && !stale
    ? checkPredictiveAlarm(forecast?.predicted, thresholds)
    : "none";

  // Active temporary target
  const activeTempTarget = (() => {
    for (const t of treatments) {
      if (t.eventType !== "Temporary Target") continue;
      const startMs = t.timestamp ?? new Date(t.created_at).getTime();
      const durationMs = (t.duration ?? 0) * 60_000;
      if (durationMs > 0 && now - startMs < durationMs) {
        const remaining = Math.ceil((startMs + durationMs - now) / 60_000);
        return { targetBottom: t.targetBottom, targetTop: t.targetTop, remaining };
      }
    }
    return null;
  })();

  const bgDisplay    = latest?.sgv ? formatGlucose(latest.sgv, unit) : "---";
  const deltaDisplay = delta?.display ?? "---";
  const arrow        = DIRECTION_ARROWS[latest?.direction ?? "NONE"] ?? "-";
  const unitLabel    = unit === "mmol" ? "mmol/L" : "mg/dL";

  // Update browser tab title with current BG
  useEffect(() => {
    const siteName = (() => {
      try {
        const s = JSON.parse(localStorage.getItem("ns_settings") ?? "{}");
        return s.customTitle || "Nightscout";
      } catch { return "Nightscout"; }
    })();
    if (latest?.sgv) {
      document.title = `${bgDisplay} ${arrow} | ${siteName}`;
    }
    return () => { document.title = siteName; };
  }, [bgDisplay, arrow, latest?.sgv]);

  // ── Alarms ──────────────────────────────────────────────────────────
  // Persisted to sessionStorage so snooze survives page refresh
  const SNOOZE_KEY = "ns_snooze_until";
  function readSnoozeUntil() {
    try { return parseInt(sessionStorage.getItem(SNOOZE_KEY) ?? "0", 10) || 0; } catch { return 0; }
  }
  function writeSnoozeUntil(ms: number) {
    try { sessionStorage.setItem(SNOOZE_KEY, String(ms)); } catch { /* noop */ }
  }
  const snoozeUntil = useRef(readSnoozeUntil());
  const lastAlarm   = useRef<string>("normal");
  const [snoozed, setSnoozed]  = useState(() => Date.now() < readSnoozeUntil());

  function snoozeDuration(level: string): number {
    const mins = settings.snoozeMins;
    if (level === "stale")        return (mins?.stale      ?? 15) * 60_000;
    if (level === "urgent-low")   return (mins?.urgentLow  ?? 30) * 60_000;
    if (level === "low")          return (mins?.low        ?? 15) * 60_000;
    if (level === "high")         return (mins?.high       ?? 30) * 60_000;
    if (level === "urgent-high")  return (mins?.urgentHigh ?? 30) * 60_000;
    return 15 * 60_000;
  }

  useEffect(() => {
    const effectiveAlarm = alarm !== "normal" ? alarm : predictive !== "none" ? predictive : null;
    if (!effectiveAlarm && !stale) { lastAlarm.current = "normal"; return; }
    // Sync from sessionStorage in case snooze was set before this render
    if (snoozeUntil.current === 0) snoozeUntil.current = readSnoozeUntil();
    if (Date.now() < snoozeUntil.current) return;
    const key = stale ? "stale" : (effectiveAlarm ?? "normal");
    if (key === lastAlarm.current) return;

    lastAlarm.current = key;
    if (stale) {
      playAlarm("stale");
      showBrowserNotification("Stale CGM Data", `Last reading ${ago} ago — check your sensor`);
      sendAlarmNotification("warn", bgDisplay, arrow).catch(() => {});
      snoozeUntil.current = Date.now() + snoozeDuration("stale");
    } else if (effectiveAlarm) {
      const isUrgent = effectiveAlarm.includes("urgent");
      const audioKey = alarm !== "normal" ? alarm : (isUrgent ? "urgent-high" : "high");
      const label = effectiveAlarm.replace("predict-", "Predicted ").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      playAlarm(audioKey as Parameters<typeof playAlarm>[0]);
      showBrowserNotification(label, `BG ${bgDisplay} ${unitLabel} ${arrow}`);
      if (settings.speakAlarms) speakText(`${label}. Blood glucose ${bgDisplay} ${unitLabel}.`);
      sendAlarmNotification(isUrgent ? "urgent" : "warn", bgDisplay, arrow).catch(() => {});
      snoozeUntil.current = Date.now() + snoozeDuration(alarm !== "normal" ? alarm : effectiveAlarm);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alarm, predictive, stale]);

  function snooze() {
    const ms      = snoozeDuration(alarm !== "normal" ? alarm : stale ? "stale" : "high");
    const until   = Date.now() + ms;
    snoozeUntil.current = until;
    writeSnoozeUntil(until);
    setSnoozed(true);
    setTimeout(() => { setSnoozed(false); writeSnoozeUntil(0); }, ms);
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* ── Announcements ─────────────────────────── */}
      <AnnouncementBanner treatments={treatments} />

      {/* ── BG header ─────────────────────────────── */}
      <Card>
        <CardContent className="pt-3 pb-3 px-3 sm:pt-4 sm:pb-4 sm:px-5">
          {/* Row 1: BG + Arrow + Delta */}
          <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
            {/* BG pill */}
            <div className={`flex items-baseline gap-2 px-4 py-2 rounded-xl ${ALARM_BG[alarm]} ${stale ? "opacity-50" : ""}`}>
              <span className={`font-bold tabular-nums leading-none ${BG_FONT_CLASS[dashCfg.bgFontSize]}`}>{bgDisplay}</span>
              <span className="text-base sm:text-xl font-medium opacity-80">{unitLabel}</span>
            </div>

            {/* Arrow + delta */}
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-4xl sm:text-5xl leading-none select-none">{arrow}</span>
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-semibold tabular-nums">{deltaDisplay}</span>
                <span className="text-xs text-muted-foreground">5 min Δ</span>
              </div>
            </div>

            {/* Right-side: time + badges */}
            <div className="flex flex-col gap-1 ml-auto items-end">
              {latest && (
                <span className="text-xs text-muted-foreground">
                  {new Date(latest.date).toLocaleTimeString([], {
                    hour: "2-digit", minute: "2-digit",
                    hour12: settings.timeFormat === "12",
                  })}
                </span>
              )}
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <Badge variant="outline" className={`text-xs px-2 py-0.5 ${stale ? "border-red-400 text-red-500" : ""}`}>
                  {stale ? "⚠ Stale" : ago}
                </Badge>
                <Badge className={`text-xs px-2 py-0.5 ${ALARM_BG[alarm]}`}>
                  {ALARM_LABEL[alarm]}
                </Badge>
              </div>
            </div>
          </div>

          {/* Row 2: Predictive / temp target badges */}
          {(predictive !== "none" || activeTempTarget) && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {predictive !== "none" && (
                <Badge className={`text-xs px-2 py-0.5 ${predictive.includes("urgent") ? "bg-red-500 text-white" : "bg-yellow-500 text-black"}`}>
                  {predictive === "predict-urgent-low"  && "⚠ Predict URGENT LOW"}
                  {predictive === "predict-low"         && "⚡ Predict Low"}
                  {predictive === "predict-high"        && "⚡ Predict High"}
                  {predictive === "predict-urgent-high" && "⚠ Predict URGENT HIGH"}
                </Badge>
              )}
              {activeTempTarget && (
                <Badge className="text-xs px-2 py-0.5 bg-blue-500 text-white">
                  🎯 Temp {activeTempTarget.targetBottom != null ? formatGlucose(activeTempTarget.targetBottom, unit) : ""}
                  {activeTempTarget.targetTop != null && activeTempTarget.targetBottom !== activeTempTarget.targetTop
                    ? `–${formatGlucose(activeTempTarget.targetTop, unit)}`
                    : ""}{" "}
                  · {activeTempTarget.remaining}m
                </Badge>
              )}
            </div>
          )}

          {/* Row 3: Actions */}
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {latest?.sgv && (
              <BolusCalcButton currentBG={latest.sgv} iob={iob} isf={isf} carbRatio={carbRatio} targetBG={targetBG} />
            )}
            <Button variant="outline" size="sm" render={<Link href="/treatments/new" />}>
              + Log
            </Button>
            {(alarm !== "normal" || stale || predictive !== "none") && !snoozed && (
              <Button variant="outline" size="sm" onClick={snooze} className="gap-1">
                <BellOff size={13} />
                <span className="hidden sm:inline">Snooze </span>
                {snoozeDuration(alarm !== "normal" ? alarm : stale ? "stale" : "high") / 60_000}m
              </Button>
            )}
            {snoozed && <Badge variant="outline" className="text-xs">Snoozed</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* ── Chart ─────────────────────────────────── */}
      <Card className="flex-1">
        <CardContent className="pt-3 px-3 pb-2">
          {/* Focus hours selector + hover readout */}
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs text-muted-foreground">
              {hovered ? (
                <span className="font-semibold text-foreground tabular-nums">
                  {unit === "mmol"
                    ? (hovered.sgv / 18.01559).toFixed(1)
                    : Math.round(hovered.sgv)}{" "}
                  {unit === "mmol" ? "mmol/L" : "mg/dL"}
                  {" · "}
                  {new Date(hovered.mills).toLocaleTimeString([], {
                    hour: "2-digit", minute: "2-digit",
                    hour12: settings.timeFormat === "12",
                  })}
                </span>
              ) : (
                <>{formatFocusLabel(focusHours)} trend · dashed = AR2 forecast</>
              )}
            </p>
            <div className="flex gap-1">
              {FOCUS_HOURS_OPTIONS.map((h) => (
                <button
                  key={h}
                  onClick={() => setFocusHours(h)}
                  className={`text-xs px-2 py-0.5 rounded transition-colors ${
                    h === focusHours
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {formatFocusLabel(h)}
                </button>
              ))}
            </div>
          </div>
          <GlucoseChart
            entries={entries}
            predicted={forecast?.predicted ?? []}
            cone={forecast?.cone ?? []}
            treatments={treatments}
            loopPredicted={loopPredicted}
            basalTimeline={basalTimeline}
            targetLow={thresholds.low}
            targetHigh={thresholds.high}
            urgentLow={thresholds.urgentLow}
            urgentHigh={thresholds.urgentHigh}
            unit={unit}
            focusHours={focusHours}
            bolusDisplayThreshold={settings.bolusDisplayThreshold ?? 0}
            timeFormat={settings.timeFormat ?? "24"}
            onHover={setHovered}
            chartHeight={dashCfg.chartHeight}
          />

          {/* ── Pills row (respects plugin visibility settings) ── */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 pt-2 border-t border-border/50 mt-2">
            {settings.plugins?.iob !== false && iob > 0 && (
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{iob.toFixed(2)}U</span> IOB
              </span>
            )}
            {settings.plugins?.cob !== false && cob.cob > 0 && (
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{Math.round(cob.cob)}g</span> COB
              </span>
            )}
            {settings.plugins?.noise !== false && sorted[0]?.noise != null && (() => {
              const noise = sorted[0].noise!;
              const labels: Record<number, string> = { 0: "None", 1: "Clean", 2: "Light", 3: "Medium", 4: "Heavy" };
              const colors: Record<number, string> = { 0: "#9ca3af", 1: "#22c55e", 2: "#eab308", 3: "#f97316", 4: "#ef4444" };
              return (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: colors[noise] ?? "#9ca3af" }}
                  />
                  {labels[noise] ?? `Noise ${noise}`}
                </span>
              );
            })()}
            {settings.plugins?.upbat !== false && statuses[0]?.uploader?.battery != null && (
              <span className="text-xs text-muted-foreground">
                Uploader: <span className={`font-medium ${statuses[0].uploader.battery < 20 ? "text-red-500" : "text-foreground"}`}>
                  {statuses[0].uploader.battery}%
                </span>
              </span>
            )}
            {settings.plugins?.pump !== false && statuses[0]?.pump?.reservoir != null && (
              <span className="text-xs text-muted-foreground">
                Reservoir: <span className={`font-medium ${(statuses[0].pump!.reservoir ?? 0) < 20 ? "text-orange-500" : "text-foreground"}`}>
                  {statuses[0].pump!.reservoir}U
                </span>
              </span>
            )}
            {settings.plugins?.pump !== false && statuses[0]?.pump?.battery?.status && (
              <span className="text-xs text-muted-foreground">
                Pump bat: <span className="font-medium text-foreground">
                  {statuses[0].pump!.battery!.status}
                </span>
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
