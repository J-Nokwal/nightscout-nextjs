"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { calcDelta } from "./delta";
import { ar2Forecast } from "./ar2";
import { timeAgo, isStale } from "./timeago";
import { getAlarmLevel, checkPredictiveAlarm, DIRECTION_ARROWS } from "./alarms";
import { formatGlucose } from "./units";
import { calcCOB } from "./cob";
import { loadSettings } from "./settings";
import { loadDashboardConfig } from "./dashboardConfig";
import type { Entry, Treatment, DeviceStatus } from "@/types/nightscout";
import type { GlucoseUnit } from "./units";
import type { GlucoseThresholds } from "./alarms";

export type { GlucoseUnit };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export interface CGMData {
  entries: Entry[];
  treatments: Treatment[];
  statuses: DeviceStatus[];
  sorted: Entry[];
  latest: Entry | undefined;
  now: number;
  delta: ReturnType<typeof calcDelta>;
  alarm: string;
  stale: boolean;
  ago: string;
  forecast: ReturnType<typeof ar2Forecast> | null;
  predictive: string;
  cob: ReturnType<typeof calcCOB>;
  loopPredicted: { startDate: string; values: number[] } | null;
  thresholds: GlucoseThresholds;
  settings: ReturnType<typeof loadSettings>;
  dashCfg: ReturnType<typeof loadDashboardConfig>;
  unit: GlucoseUnit;
  bgDisplay: string;
  deltaDisplay: string;
  arrow: string;
  unitLabel: string;
}

export function useCGMData(
  initialEntries: Entry[],
  initialTreatments: Treatment[],
  propUnit?: GlucoseUnit,
): CGMData {
  const [settings] = useState(() => loadSettings());
  const [dashCfg, setDashCfg] = useState(() => loadDashboardConfig());

  useEffect(() => {
    const handler = () => setDashCfg(loadDashboardConfig());
    window.addEventListener("ns-dashboard-config", handler);
    return () => window.removeEventListener("ns-dashboard-config", handler);
  }, []);

  const { data: entries = initialEntries } = useSWR<Entry[]>(
    "/api/v3/entries?count=288",
    fetcher,
    { refreshInterval: 60_000, fallbackData: initialEntries },
  );
  const { data: treatments = initialTreatments } = useSWR<Treatment[]>(
    "/api/v3/treatments?count=50",
    fetcher,
    { refreshInterval: 60_000, fallbackData: initialTreatments },
  );
  const { data: statuses = [] } = useSWR<DeviceStatus[]>(
    "/api/v3/devicestatus?count=1",
    fetcher,
    { refreshInterval: 60_000 },
  );

  const now  = useNow();
  const unit: GlucoseUnit = propUnit ?? settings.unit;
  const cob  = calcCOB(treatments, settings.carbsPerHour, now);
  const sorted = [...entries].filter((e) => e.sgv).sort((a, b) => b.date - a.date);
  const latest = sorted[0];

  const rawLoopPred = statuses[0]?.loop?.predicted;
  const loopPredicted =
    rawLoopPred?.startDate && rawLoopPred?.values
      ? { startDate: rawLoopPred.startDate, values: rawLoopPred.values }
      : null;

  const thresholds: GlucoseThresholds = {
    urgentLow:  settings.urgentLow,
    low:        settings.low,
    high:       settings.high,
    urgentHigh: settings.urgentHigh,
  };

  const delta     = calcDelta(sorted);
  const alarm     = latest ? getAlarmLevel(latest, thresholds) : "normal";
  const stale     = latest ? isStale(latest.date, now) : true;
  const ago       = latest ? timeAgo(latest.date, now) : "---";
  const forecast  = latest && delta
    ? ar2Forecast(latest.sgv!, delta.mean5MinsAgo, latest.date)
    : null;
  const predictive =
    alarm === "normal" && !stale
      ? checkPredictiveAlarm(forecast?.predicted, thresholds)
      : "none";

  const bgDisplay    = latest?.sgv ? formatGlucose(latest.sgv, unit) : "---";
  const deltaDisplay = delta?.display ?? "---";
  const arrow        = DIRECTION_ARROWS[latest?.direction ?? "NONE"] ?? "-";
  const unitLabel    = unit === "mmol" ? "mmol/L" : "mg/dL";

  return {
    entries, treatments, statuses,
    sorted, latest, now,
    delta, alarm, stale, ago,
    forecast, predictive,
    cob, loopPredicted, thresholds,
    settings, dashCfg, unit,
    bgDisplay, deltaDisplay, arrow, unitLabel,
  };
}
