import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { calcTIR } from "@/lib/nightscout/tir";
import { calcGlucoseStats } from "@/lib/nightscout/stats";
import { calcAGP } from "@/lib/nightscout/agp";
import { ReportTabs } from "@/components/dashboard/ReportTabs";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

const PERIODS = [
  { label: "7 days",  days: 7  },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

const TIR_THRESHOLDS = { urgentLow: 54, low: 70, high: 180, urgentHigh: 250 };

interface PageProps {
  searchParams: Promise<{ days?: string }>;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { days: daysParam } = await searchParams;
  const days = Number(daysParam ?? 14);
  const validDays = PERIODS.find((p) => p.days === days)?.days ?? 14;

  // eslint-disable-next-line react-hooks/purity
  const dateTo   = Date.now();
  const dateFrom = dateTo - validDays * 24 * 60 * 60 * 1000;

  const count = validDays * 288 + 50;
  const entries = await db.getEntries({ count, dateFrom, dateTo }).catch(() => []);

  const stats = calcGlucoseStats(entries);
  const tir   = calcTIR(entries, TIR_THRESHOLDS);
  const agp   = calcAGP(entries);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold">Reports</h1>
        <div className="flex gap-2 flex-wrap">
          {PERIODS.map(({ label, days: d }) => (
            <Button
              key={d}
              variant={d === validDays ? "default" : "outline"}
              size="sm"
              render={<Link href={`/reports?days=${d}`} />}
            >
              {label}
            </Button>
          ))}
          <Button variant="outline" size="sm" render={<Link href={`/api/v3/entries/export?days=${validDays}&format=csv`} />}>
            <Download size={14} className="mr-1" /> BG CSV
          </Button>
          <Button variant="outline" size="sm" render={<Link href={`/api/v3/entries/export?days=${validDays}&format=json`} />}>
            <Download size={14} className="mr-1" /> BG JSON
          </Button>
          <Button variant="outline" size="sm" render={<Link href={`/api/v3/treatments/export?days=${validDays}&format=csv`} />}>
            <Download size={14} className="mr-1" /> Tx CSV
          </Button>
          <Button variant="outline" size="sm" render={<Link href={`/api/v3/treatments/export?days=${validDays}&format=json`} />}>
            <Download size={14} className="mr-1" /> Tx JSON
          </Button>
          <PrintButton />
        </div>
      </div>

      <ReportTabs
        entries={entries}
        stats={stats}
        tir={tir}
        agp={agp}
        validDays={validDays}
      />
    </div>
  );
}
