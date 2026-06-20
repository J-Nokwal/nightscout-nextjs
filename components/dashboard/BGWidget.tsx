"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BellOff } from "lucide-react";
import { BolusCalcButton } from "@/components/dashboard/BolusCalc";
import { AnnouncementBanner } from "@/components/dashboard/AnnouncementBanner";
import { BG_FONT_CLASS } from "@/lib/nightscout/dashboardConfig";
import { formatGlucose } from "@/lib/nightscout/units";
import { playAlarm } from "@/lib/nightscout/alarmAudio";
import { sendAlarmNotification } from "@/app/actions/notify";
import {
  requestNotificationPermission,
  showBrowserNotification,
  speakText,
} from "@/lib/nightscout/browserNotify";
import { useRealtimeUpdates } from "@/lib/sse/useRealtimeUpdates";
import { useCGMData } from "@/lib/nightscout/useCGMData";
import type { Entry, Treatment } from "@/types/nightscout";
import type { GlucoseUnit } from "@/lib/nightscout/units";

interface Props {
  initialEntries: Entry[];
  initialTreatments?: Treatment[];
  unit?: GlucoseUnit;
  iob?: number;
  isf?: number;
  carbRatio?: number;
  targetBG?: number;
}

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

export function BGWidget({
  initialEntries,
  initialTreatments = [],
  unit: propUnit,
  iob = 0,
  isf = 50,
  carbRatio = 10,
  targetBG = 100,
}: Props) {
  const {
    treatments, latest,
    alarm, stale, ago, predictive,
    settings, dashCfg, unit,
    bgDisplay, deltaDisplay, arrow, unitLabel,
    now,
  } = useCGMData(initialEntries, initialTreatments, propUnit);

  // Container-width measurement
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(999);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => setCw(e.contentRect.width));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const forceCompact = dashCfg.bgLayout === "compact";
  // Below 340px, even "full" mode goes compact
  const isCompact = forceCompact || cw < 340;
  // Medium: 340–520px — full info but stacked
  const isWide = !isCompact && cw >= 520;

  useRealtimeUpdates();
  useEffect(() => { requestNotificationPermission(); }, []);

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

  // Browser tab title
  useEffect(() => {
    const siteName = (() => {
      try {
        const s = JSON.parse(localStorage.getItem("ns_settings") ?? "{}");
        return s.customTitle || "Nightscout";
      } catch { return "Nightscout"; }
    })();
    if (latest?.sgv) document.title = `${bgDisplay} ${arrow} | ${siteName}`;
    return () => { document.title = siteName; };
  }, [bgDisplay, arrow, latest?.sgv]);

  // Snooze
  const SNOOZE_KEY = "ns_snooze_until";
  function readSnoozeUntil() {
    try { return parseInt(sessionStorage.getItem(SNOOZE_KEY) ?? "0", 10) || 0; } catch { return 0; }
  }
  function writeSnoozeUntil(ms: number) {
    try { sessionStorage.setItem(SNOOZE_KEY, String(ms)); } catch { /* noop */ }
  }
  const snoozeUntil = useRef(readSnoozeUntil());
  const lastAlarm   = useRef<string>("normal");
  const [snoozed, setSnoozed] = useState(() => Date.now() < readSnoozeUntil());

  function snoozeDuration(level: string): number {
    const mins = settings.snoozeMins;
    if (level === "stale")       return (mins?.stale      ?? 15) * 60_000;
    if (level === "urgent-low")  return (mins?.urgentLow  ?? 30) * 60_000;
    if (level === "low")         return (mins?.low        ?? 15) * 60_000;
    if (level === "high")        return (mins?.high       ?? 30) * 60_000;
    if (level === "urgent-high") return (mins?.urgentHigh ?? 30) * 60_000;
    return 15 * 60_000;
  }

  useEffect(() => {
    const effectiveAlarm = alarm !== "normal" ? alarm : predictive !== "none" ? predictive : null;
    if (!effectiveAlarm && !stale) { lastAlarm.current = "normal"; return; }
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
    const ms    = snoozeDuration(alarm !== "normal" ? alarm : stale ? "stale" : "high");
    const until = Date.now() + ms;
    snoozeUntil.current = until;
    writeSnoozeUntil(until);
    setSnoozed(true);
    setTimeout(() => { setSnoozed(false); writeSnoozeUntil(0); }, ms);
  }

  const timeStr = latest
    ? new Date(latest.date).toLocaleTimeString([], {
        hour: "2-digit", minute: "2-digit",
        hour12: settings.timeFormat === "12",
      })
    : null;

  const alarmBadge = (
    <Badge className={`text-xs px-2 py-0.5 ${ALARM_BG[alarm]}`}>
      {ALARM_LABEL[alarm]}
    </Badge>
  );

  const staleBadge = (
    <Badge variant="outline" className={`text-xs px-2 py-0.5 ${stale ? "border-red-400 text-red-500" : ""}`}>
      {stale ? "⚠ Stale" : ago}
    </Badge>
  );

  // ── Compact layout ───────────────────────────────────────────────────────────
  if (isCompact) {
    return (
      <div ref={wrapRef} className="h-full">
        <div className={`h-full rounded-xl flex items-center gap-2 px-3 ${ALARM_BG[alarm]} ${stale ? "opacity-60" : ""}`}>
          <span className={`font-bold tabular-nums leading-none ${BG_FONT_CLASS[dashCfg.bgFontSize]}`}>
            {bgDisplay}
          </span>
          <span className="text-3xl leading-none select-none">{arrow}</span>
          <div className="flex flex-col min-w-0">
            <span className="text-lg font-semibold tabular-nums">{deltaDisplay}</span>
            <span className="text-xs opacity-70">{stale ? "⚠ stale" : ago}</span>
          </div>
          {(alarm !== "normal" || stale || predictive !== "none") && !snoozed && (
            <button
              onClick={snooze}
              className="ml-auto p-1.5 rounded-lg bg-black/20 hover:bg-black/30 transition-colors"
              title="Snooze alarm"
            >
              <BellOff size={14} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Full layout ──────────────────────────────────────────────────────────────
  return (
    <div ref={wrapRef} className="flex flex-col gap-2 h-full">
      <AnnouncementBanner treatments={treatments} />

      <Card className="flex-1 overflow-hidden">
        <CardContent className="pt-3 pb-3 px-3 h-full flex flex-col justify-center gap-2 overflow-y-auto scrollbar-none">

          {/* Row 1: BG block + arrow/delta + meta */}
          <div className={`flex gap-3 ${isWide ? "items-center" : "items-start flex-wrap"}`}>
            {/* BG badge */}
            <div className={`flex items-baseline gap-2 px-4 py-2 rounded-xl shrink-0 ${ALARM_BG[alarm]} ${stale ? "opacity-50" : ""}`}>
              <span className={`font-bold tabular-nums leading-none ${BG_FONT_CLASS[dashCfg.bgFontSize]}`}>
                {bgDisplay}
              </span>
              <span className="text-base font-medium opacity-80">{unitLabel}</span>
            </div>

            {/* Arrow + delta */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-4xl leading-none select-none">{arrow}</span>
              <div className="flex flex-col">
                <span className="text-xl font-semibold tabular-nums">{deltaDisplay}</span>
                <span className="text-xs text-muted-foreground">5 min Δ</span>
              </div>
            </div>

            {/* Meta: time + badges */}
            <div className={`flex flex-col gap-1 ${isWide ? "ml-auto items-end" : "items-start"}`}>
              {timeStr && <span className="text-xs text-muted-foreground">{timeStr}</span>}
              <div className="flex items-center gap-1.5 flex-wrap">
                {staleBadge}
                {alarmBadge}
              </div>
            </div>
          </div>

          {/* Row 2: Predictive / temp target badges */}
          {(predictive !== "none" || activeTempTarget) && (
            <div className="flex flex-wrap gap-1.5">
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
          <div className="flex items-center gap-2 flex-wrap">
            {latest?.sgv && (
              <BolusCalcButton currentBG={latest.sgv} iob={iob} isf={isf} carbRatio={carbRatio} targetBG={targetBG} />
            )}
            <Button variant="outline" size="sm" render={<Link href="/treatments/new" />}>
              + Log
            </Button>
            {(alarm !== "normal" || stale || predictive !== "none") && !snoozed && (
              <Button variant="outline" size="sm" onClick={snooze} className="gap-1">
                <BellOff size={13} />
                Snooze {snoozeDuration(alarm !== "normal" ? alarm : stale ? "stale" : "high") / 60_000}m
              </Button>
            )}
            {snoozed && <Badge variant="outline" className="text-xs">Snoozed</Badge>}
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
