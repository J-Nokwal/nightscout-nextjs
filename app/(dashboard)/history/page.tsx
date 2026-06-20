import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GlucoseChart } from "@/components/charts/GlucoseChart";
import { calcGlucoseStats } from "@/lib/nightscout/stats";
import { calcTIR } from "@/lib/nightscout/tir";
import { HistoryCalendar } from "./HistoryCalendar";

export const metadata = { title: "History" };

export const dynamic = "force-dynamic";

const TIR_THRESHOLDS = { urgentLow: 54, low: 70, high: 180, urgentHigh: 250 };

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function HistoryPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { date: dateParam } = await searchParams;
  const today = new Date();
  const viewDate = dateParam ? new Date(dateParam + "T00:00:00") : new Date(isoDate(today) + "T00:00:00");

  const dateFrom = viewDate.getTime();
  const dateTo   = dateFrom + 24 * 60 * 60 * 1000 - 1;

  const prevDate = new Date(dateFrom - 24 * 60 * 60 * 1000);
  const nextDate = new Date(dateFrom + 24 * 60 * 60 * 1000);
  const isToday  = isoDate(viewDate) === isoDate(today);

  const uiSettings = await db.getUISettings().catch(() => null);
  const timeFormat = uiSettings?.timeFormat ?? "24";

  const entries = await db.getEntries({ count: 300, dateFrom, dateTo }).catch(() => []);
  const treatments = await db.getTreatments({ count: 100, find: {} }).then((all) =>
    all.filter((t) => {
      const tm = t.timestamp ?? new Date(t.created_at).getTime();
      return tm >= dateFrom && tm <= dateTo;
    })
  ).catch(() => []);

  const stats = calcGlucoseStats(entries);
  const tir   = calcTIR(entries, TIR_THRESHOLDS);

  const displayDate = viewDate.toLocaleDateString([], {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const currentDateStr = isoDate(viewDate);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      {/* Date navigation — calendar picker inline with arrows */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="icon" render={<Link href={`/history?date=${isoDate(prevDate)}`} />}>
          <ChevronLeft size={16} />
        </Button>

        {/* Calendar popover trigger */}
        <HistoryCalendar currentDate={currentDateStr} />

        <Button
          variant="outline" size="icon"
          render={<Link href={`/history?date=${isoDate(nextDate)}`} />}
          disabled={isToday}
        >
          <ChevronRight size={16} />
        </Button>

        {!isToday && (
          <Button variant="ghost" size="sm" render={<Link href="/history" />} className="text-muted-foreground">
            Today
          </Button>
        )}
      </div>

      {/* Summary stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            { label: "Avg BG",   value: `${stats.mean} mg/dL` },
            { label: "SD",       value: `${stats.sd} mg/dL` },
            { label: "TIR",      value: `${tir.inRange}%` },
            { label: "Readings", value: String(stats.count) },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-4">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="text-xl font-bold tabular-nums mt-0.5">{value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Glucose chart */}
      <Card>
        <CardContent className="pt-4 px-3 pb-2">
          <p className="text-xs text-muted-foreground mb-2 px-1">
            {displayDate} · {entries.length} readings
          </p>
          {entries.length > 0 ? (
            <div className="h-[420px]">
              <GlucoseChart
                entries={entries}
                predicted={[]}
                cone={[]}
                treatments={treatments}
                targetLow={70}
                targetHigh={180}
                urgentLow={54}
                urgentHigh={250}
                timeFormat={timeFormat}
              />
            </div>
          ) : (
            <div className="h-[420px] flex items-center justify-center text-muted-foreground">
              No data for this day
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
