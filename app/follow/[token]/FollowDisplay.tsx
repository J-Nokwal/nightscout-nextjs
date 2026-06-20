"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GlucoseChart } from "@/components/charts/GlucoseChart";
import { AnnouncementBanner } from "@/components/dashboard/AnnouncementBanner";
import { calcDelta } from "@/lib/nightscout/delta";
import { ar2Forecast } from "@/lib/nightscout/ar2";
import { timeAgo, isStale } from "@/lib/nightscout/timeago";
import { getAlarmLevel, DIRECTION_ARROWS } from "@/lib/nightscout/alarms";
import { formatGlucose } from "@/lib/nightscout/units";
import { loadSettings } from "@/lib/nightscout/settings";
import type { Entry, Treatment } from "@/types/nightscout";

const THRESHOLDS = { urgentLow: 55, low: 70, high: 180, urgentHigh: 260 };

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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Props {
  initialEntries: Entry[];
}

export function FollowDisplay({ initialEntries }: Props) {
  const timeFormat = loadSettings().timeFormat ?? "24";

  const { data: entries = initialEntries } = useSWR<Entry[]>(
    "/api/v3/entries?count=288",
    fetcher,
    { refreshInterval: 60_000, fallbackData: initialEntries }
  );

  const { data: treatments = [] } = useSWR<Treatment[]>(
    "/api/v3/treatments?eventType=Announcement&count=10",
    fetcher,
    { refreshInterval: 120_000 }
  );

  const sorted  = [...entries].filter((e) => e.sgv).sort((a, b) => b.date - a.date);
  const latest  = sorted[0];
  // eslint-disable-next-line react-hooks/purity
  const now     = Date.now();
  const delta   = calcDelta(sorted);
  const alarm   = latest ? getAlarmLevel(latest, THRESHOLDS) : "normal";
  const stale   = latest ? isStale(latest.date, now) : true;
  const ago     = latest ? timeAgo(latest.date, now) : "---";
  const forecast = latest && delta
    ? ar2Forecast(latest.sgv!, delta.mean5MinsAgo, latest.date)
    : null;

  const bgDisplay    = latest?.sgv ? formatGlucose(latest.sgv, "mg/dl") : "---";
  const deltaDisplay = delta?.display ?? "---";
  const arrow        = DIRECTION_ARROWS[latest?.direction ?? "NONE"] ?? "-";

  // Update browser tab title
  useEffect(() => {
    if (latest?.sgv) {
      document.title = `${bgDisplay} ${arrow} | Nightscout`;
    }
    return () => { document.title = "Nightscout"; };
  }, [bgDisplay, arrow, latest?.sgv]);

  return (
    <div className="flex-1 flex flex-col gap-4 p-4 max-w-2xl mx-auto w-full">
      {treatments.length > 0 && <AnnouncementBanner treatments={treatments} />}

      {/* BG display */}
      <Card>
        <CardContent className="pt-6 pb-4">
          <div className="flex flex-wrap items-center gap-5">
            <div className={`flex items-baseline gap-2 px-5 py-3 rounded-xl ${ALARM_BG[alarm]} ${stale ? "opacity-50" : ""}`}>
              <span className="text-6xl font-bold tabular-nums leading-none">{bgDisplay}</span>
              <span className="text-lg opacity-80">mg/dL</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-5xl leading-none">{arrow}</span>
              <span className="text-2xl font-semibold tabular-nums">{deltaDisplay}</span>
            </div>
            <div className="ml-auto flex flex-col gap-1.5 items-end">
              <Badge className={`${ALARM_BG[alarm]} text-sm px-3 py-1`}>{ALARM_LABEL[alarm]}</Badge>
              <Badge variant="outline" className={stale ? "border-red-400 text-red-500" : ""}>
                {stale ? "⚠ Stale" : ago}
              </Badge>
              {latest && (
                <span className="text-xs text-muted-foreground">
                  {new Date(latest.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card className="flex-1">
        <CardContent className="pt-4 px-3 pb-2">
          <p className="text-xs text-muted-foreground mb-2 px-1">24h Trend · dashed = AR2 forecast</p>
          <GlucoseChart
            entries={entries}
            predicted={forecast?.predicted ?? []}
            cone={forecast?.cone ?? []}
            targetLow={THRESHOLDS.low}
            targetHigh={THRESHOLDS.high}
            urgentLow={THRESHOLDS.urgentLow}
            urgentHigh={THRESHOLDS.urgentHigh}
            timeFormat={timeFormat}
          />
        </CardContent>
      </Card>
    </div>
  );
}
