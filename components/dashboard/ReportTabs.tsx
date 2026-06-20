"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AGPChart } from "@/components/charts/AGPChart";
import { DayToDayChart } from "@/components/charts/DayToDayChart";
import { DistributionChart } from "@/components/charts/DistributionChart";
import { HourlyStatsChart } from "@/components/charts/HourlyStatsChart";
import { WeekToWeekChart } from "@/components/charts/WeekToWeekChart";
import type { Entry } from "@/types/nightscout";
import type { TIRResult } from "@/lib/nightscout/tir";
import type { GlucoseStats } from "@/lib/nightscout/stats";
import type { AGPSlot } from "@/lib/nightscout/agp";

interface Props {
  entries: Entry[];
  stats: GlucoseStats | null;
  tir: TIRResult;
  agp: AGPSlot[];
  validDays: number;
  unit?: "mg/dl" | "mmol";
}

const TABS = [
  { id: "overview",    label: "Overview" },
  { id: "day-to-day",  label: "Day to Day" },
  { id: "week-to-week",label: "Week to Week" },
  { id: "agp",         label: "AGP" },
  { id: "hourly",      label: "Hourly Stats" },
  { id: "dist",        label: "Distribution" },
  { id: "loopalyzer",  label: "Loopalyzer" },
];

const TIR_ZONES = [
  { label: "Very High (>250)",   key: "veryHigh" as const, color: "#dc2626", target: "<5%" },
  { label: "High (180–250)",     key: "high"     as const, color: "#f59e0b", target: "<25%" },
  { label: "In Range (70–180)",  key: "inRange"  as const, color: "#22c55e", target: ">70%" },
  { label: "Low (54–70)",        key: "low"      as const, color: "#f97316", target: "<4%" },
  { label: "Very Low (<54)",     key: "veryLow"  as const, color: "#7f1d1d", target: "<1%" },
];

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tabular-nums">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export function ReportTabs({ entries, stats, tir, agp, validDays, unit = "mg/dl" }: Props) {
  const [tab, setTab] = useState<string>("overview");

  const thresholds = { targetLow: 70, targetHigh: 180, urgentLow: 54, urgentHigh: 250, unit };

  return (
    <div className="space-y-4">
      {/* Tab buttons — horizontal scroll on mobile */}
      <div className="flex gap-1 overflow-x-auto border-b pb-2 -mx-1 px-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`text-sm px-3 py-1.5 rounded-t transition-colors whitespace-nowrap shrink-0 ${
              tab === id
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <>
          {(!entries.length || !stats) ? (
            <p className="text-muted-foreground">No data for this period.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Average BG" value={`${stats.mean} mg/dL`} sub={`≈ ${(stats.mean / 18.01559).toFixed(1)} mmol/L`} />
                <StatCard label="Est. A1c" value={`${stats.a1c}%`} sub="ADAG formula" />
                <StatCard label="Std Deviation" value={`${stats.sd} mg/dL`} sub={`CV ${stats.cv}%${stats.cv <= 36 ? " ✓" : " ↑"}`} />
                <StatCard label="Range" value={`${stats.min}–${stats.max}`} sub={`${stats.count} readings`} />
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Time in Range — {validDays} days</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex h-8 rounded-lg overflow-hidden w-full">
                    {TIR_ZONES.map(({ key, color }) => {
                      const pct = tir[key];
                      if (!pct) return null;
                      return (
                        <div key={key} style={{ width: `${pct}%`, background: color }}
                          className="flex items-center justify-center transition-all">
                          {pct >= 6 && <span className="text-white text-xs font-bold">{pct}%</span>}
                        </div>
                      );
                    })}
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b">
                        <th className="text-left pb-2 font-medium">Zone</th>
                        <th className="text-right pb-2 font-medium">Time</th>
                        <th className="text-right pb-2 font-medium">Target</th>
                        <th className="text-right pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {TIR_ZONES.map(({ label, key, color, target }) => {
                        const pct = tir[key];
                        const isInRange = key === "inRange";
                        const targetNum = parseInt(target.replace(/[^0-9]/g, ""), 10);
                        const ok = isInRange ? pct >= 70 : pct <= targetNum;
                        return (
                          <tr key={key} className="py-2">
                            <td className="py-2 flex items-center gap-2">
                              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: color }} />
                              {label}
                            </td>
                            <td className="text-right tabular-nums font-medium">{pct}%</td>
                            <td className="text-right text-muted-foreground">{target}</td>
                            <td className="text-right">
                              <Badge variant={ok ? "outline" : "destructive"} className="text-xs">
                                {ok ? "OK" : "Off"}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {tir.count > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Based on {tir.count} readings over {validDays} days ({Math.round((tir.count / (validDays * 288)) * 100)}% coverage)
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {/* Day to Day tab */}
      {tab === "day-to-day" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Day to Day — last {validDays} days</CardTitle>
          </CardHeader>
          <CardContent>
            <DayToDayChart entries={entries} days={validDays} {...thresholds} />
          </CardContent>
        </Card>
      )}

      {/* Week to Week tab */}
      {tab === "week-to-week" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Week to Week — last {validDays} days</CardTitle>
          </CardHeader>
          <CardContent>
            <WeekToWeekChart entries={entries} weeks={Math.ceil(validDays / 7)} {...thresholds} />
          </CardContent>
        </Card>
      )}

      {/* AGP tab */}
      {tab === "agp" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Ambulatory Glucose Profile (AGP)
              <span className="ml-2 font-normal text-muted-foreground">
                — median · p25–p75 · p10–p90
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {agp.some((s) => s.count >= 3) ? (
              <>
                <AGPChart data={agp} targetLow={70} targetHigh={180} />
                <p className="text-xs text-muted-foreground mt-2">
                  Darker band = 50% of readings (p25–p75). Lighter band = 80% (p10–p90). Line = median.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Not enough data for AGP (need at least 3 readings per hour-slot).</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hourly Stats tab */}
      {tab === "hourly" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Hourly Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <HourlyStatsChart entries={entries} {...thresholds} />
            <p className="text-xs text-muted-foreground mt-2">
              Green band = 10th–90th percentile. Darker = 25th–75th percentile. Line = mean.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Distribution tab */}
      {tab === "dist" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">BG Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionChart entries={entries} {...thresholds} />
          </CardContent>
        </Card>
      )}

      {/* Loopalyzer tab */}
      {tab === "loopalyzer" && <LoopalyzerTab entries={entries} unit={unit} />}
    </div>
  );
}

const DAY_SEGMENTS = [
  { label: "Overnight (00–06)", from: 0,  to: 6  },
  { label: "Morning  (06–12)", from: 6,  to: 12 },
  { label: "Afternoon (12–18)", from: 12, to: 18 },
  { label: "Evening  (18–24)", from: 18, to: 24 },
];

function LoopalyzerTab({ entries, unit = "mg/dl" }: { entries: Entry[]; unit?: "mg/dl" | "mmol" }) {
  const tgtLow = 70, tgtHigh = 180;

  // Per-segment stats
  const segments = DAY_SEGMENTS.map(({ label, from, to }) => {
    const seg = entries.filter((e) => {
      if (!e.sgv) return false;
      const h = new Date(e.date).getHours();
      return h >= from && h < to;
    });
    if (!seg.length) return { label, mean: null, tir: null, count: 0 };
    const values = seg.map((e) => e.sgv!);
    const mean = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const tir  = Math.round(values.filter((v) => v >= tgtLow && v <= tgtHigh).length / values.length * 100);
    return { label, mean, tir, count: values.length };
  });

  // BG stability — % of consecutive pairs within ±20 mg/dL
  const sorted = [...entries].filter((e) => e.sgv).sort((a, b) => a.date - b.date);
  let stableCount = 0, pairCount = 0;
  for (let i = 1; i < sorted.length; i++) {
    const dt = sorted[i].date - sorted[i - 1].date;
    if (dt < 4 * 60_000 || dt > 8 * 60_000) continue; // only ~5-min pairs
    pairCount++;
    if (Math.abs(sorted[i].sgv! - sorted[i - 1].sgv!) <= 20) stableCount++;
  }
  const stabilityPct = pairCount ? Math.round(stableCount / pairCount * 100) : null;

  // MARD-like: mean abs deviation between consecutive 5-min pairs (mg/dL/reading)
  let totalDev = 0, devCount = 0;
  for (let i = 1; i < sorted.length; i++) {
    const dt = sorted[i].date - sorted[i - 1].date;
    if (dt < 4 * 60_000 || dt > 8 * 60_000) continue;
    totalDev += Math.abs(sorted[i].sgv! - sorted[i - 1].sgv!);
    devCount++;
  }
  const mardMgdl = devCount ? (totalDev / devCount).toFixed(1) : null;

  const disp = (v: number) => unit === "mmol" ? (v / 18.01559).toFixed(1) : String(v);
  const unitLabel = unit === "mmol" ? "mmol/L" : "mg/dL";

  return (
    <div className="space-y-4">
      {/* Stability summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">BG Stability</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">{stabilityPct != null ? `${stabilityPct}%` : "—"}</div>
            <div className="text-xs text-muted-foreground mt-1">readings within ±20 of prior</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Mean BG Change</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">{mardMgdl != null ? `${mardMgdl}` : "—"}</div>
            <div className="text-xs text-muted-foreground mt-1">{unitLabel} / 5-min reading</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Readings Analyzed</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">{entries.filter((e) => e.sgv).length}</div>
            <div className="text-xs text-muted-foreground mt-1">total CGM readings</div>
          </CardContent>
        </Card>
      </div>

      {/* Per-segment breakdown */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Time-of-Day Breakdown</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b">
                <th className="text-left pb-2 font-medium">Segment</th>
                <th className="text-right pb-2 font-medium">Mean BG</th>
                <th className="text-right pb-2 font-medium">TIR (70–180)</th>
                <th className="text-right pb-2 font-medium">Readings</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {segments.map(({ label, mean, tir, count }) => (
                <tr key={label}>
                  <td className="py-2">{label}</td>
                  <td className="py-2 text-right tabular-nums font-medium">
                    {mean != null ? `${disp(mean)} ${unitLabel}` : "—"}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {tir != null ? (
                      <Badge variant={tir >= 70 ? "outline" : "destructive"} className="text-xs">{tir}%</Badge>
                    ) : "—"}
                  </td>
                  <td className="py-2 text-right text-muted-foreground tabular-nums">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground mt-3">
            Segments are based on local clock time across all selected days. TIR target: ≥70%.
          </p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Full Loopalyzer analysis (IOB curves, Loop-vs-manual comparison) requires Loop device status history stored in <code>/api/v3/devicestatus</code>.
      </p>
    </div>
  );
}
