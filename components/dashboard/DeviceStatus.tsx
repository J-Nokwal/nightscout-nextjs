"use client";

import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { calcSAGE, calcCAGE, calcIAGE, calcBAGE } from "@/lib/nightscout/deviceAge";
import { calcIOB } from "@/lib/nightscout/iob";
import { calcCOB } from "@/lib/nightscout/cob";
import type { DeviceStatus, Treatment } from "@/types/nightscout";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ── shared primitives ─────────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs min-w-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right truncate">{children}</span>
    </div>
  );
}

function AgeBadge({ label, hours, warnAt, urgentAt }: {
  label: string; hours: number | null; warnAt: number; urgentAt: number;
}) {
  const color = hours === null ? "bg-muted text-muted-foreground"
    : hours >= urgentAt ? "bg-red-500 text-white"
    : hours >= warnAt  ? "bg-yellow-500 text-black"
    : "bg-green-600 text-white";
  const d = hours !== null ? Math.floor(hours / 24) : 0;
  const h = hours !== null ? Math.floor(hours % 24) : 0;
  const display = hours === null ? "—" : d > 0 ? `${d}d ${h}h` : `${h}h`;
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${color}`}>{display}</Badge>
    </div>
  );
}

function BatteryBar({ pct }: { pct: number }) {
  const color = pct < 20 ? "bg-red-500" : pct < 40 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums w-7 text-right shrink-0">{pct}%</span>
    </div>
  );
}

function WidgetCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="h-full overflow-hidden">
      <CardContent className="px-3 pt-2.5 pb-3 h-full flex flex-col gap-1.5 overflow-y-auto scrollbar-none">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
          {title}
        </p>
        {children}
      </CardContent>
    </Card>
  );
}

// ── props types ───────────────────────────────────────────────────────────────

interface TreatmentProps {
  initialTreatments: Treatment[];
  dia?: number;
  carbsPerHour?: number;
}

interface StatusProps {
  initialStatuses: DeviceStatus[];
  initialTreatments?: Treatment[];
  scheduledBasal?: number;
}

// ── Active (IOB / COB) ────────────────────────────────────────────────────────

export function ActiveWidget({ initialTreatments, dia = 6, carbsPerHour = 20 }: TreatmentProps) {
  const { data: treatments = initialTreatments } = useSWR<Treatment[]>(
    "/api/v3/treatments?count=100", fetcher,
    { refreshInterval: 60_000, fallbackData: initialTreatments },
  );

  const iob = calcIOB(treatments, dia);
  const cob = calcCOB(treatments, carbsPerHour);

  return (
    <WidgetCard title="Active">
      <div className="flex items-baseline gap-1 flex-wrap">
        <span className="text-2xl font-bold tabular-nums">{iob.iob.toFixed(2)}</span>
        <span className="text-xs text-muted-foreground">U IOB</span>
      </div>
      <div className="flex items-baseline gap-1 flex-wrap">
        <span className="text-2xl font-bold tabular-nums">{Math.round(cob.cob)}</span>
        <span className="text-xs text-muted-foreground">g COB</span>
      </div>
    </WidgetCard>
  );
}

// ── Pump ──────────────────────────────────────────────────────────────────────

export function PumpWidget({ initialStatuses, initialTreatments = [], scheduledBasal }: StatusProps) {
  const { data: statuses = initialStatuses } = useSWR<DeviceStatus[]>(
    "/api/v3/devicestatus?count=1", fetcher,
    { refreshInterval: 60_000, fallbackData: initialStatuses },
  );
  const { data: treatments = initialTreatments } = useSWR<Treatment[]>(
    "/api/v3/treatments?count=100", fetcher,
    { refreshInterval: 60_000, fallbackData: initialTreatments },
  );

  const pump = statuses[0]?.pump;
  // eslint-disable-next-line react-hooks/purity
  const now  = Date.now();
  const activeTempBasal = treatments
    .filter((t) => t.eventType === "Temp Basal" && t.duration != null)
    .find((t) => {
      const start = t.timestamp ?? new Date(t.created_at).getTime();
      return now - start < (t.duration ?? 0) * 60_000;
    });

  const noData = !pump && activeTempBasal == null && scheduledBasal == null;

  return (
    <WidgetCard title="Pump">
      {pump?.reservoir != null && (
        <Row label="Reservoir">{Math.round(pump.reservoir)}U</Row>
      )}
      {pump?.battery?.voltage != null && (
        <Row label="Battery">{pump.battery.voltage.toFixed(2)}V</Row>
      )}
      {pump?.status?.status && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 w-fit">
          {pump.status.status}
        </Badge>
      )}
      {activeTempBasal != null ? (
        <Row label="Temp Basal">
          <span className="text-yellow-600 dark:text-yellow-400">
            {activeTempBasal.absolute?.toFixed(3) ?? "—"} U/hr
          </span>
        </Row>
      ) : scheduledBasal != null ? (
        <Row label="Basal">{scheduledBasal.toFixed(3)} U/hr</Row>
      ) : null}
      {noData && <p className="text-xs text-muted-foreground">No pump data</p>}
    </WidgetCard>
  );
}

// ── Loop / Phone ──────────────────────────────────────────────────────────────

export function LoopWidget({ initialStatuses }: { initialStatuses: DeviceStatus[] }) {
  const { data: statuses = initialStatuses } = useSWR<DeviceStatus[]>(
    "/api/v3/devicestatus?count=1", fetcher,
    { refreshInterval: 60_000, fallbackData: initialStatuses },
  );

  const loop     = statuses[0]?.loop;
  const uploader = statuses[0]?.uploader;

  return (
    <WidgetCard title="Loop / Phone">
      {loop?.enacted?.rate != null && (
        <Row label="Enacted">{loop.enacted.rate} U/hr</Row>
      )}
      {loop?.iob?.iob != null && (
        <Row label="Loop IOB">{loop.iob.iob.toFixed(2)}U</Row>
      )}
      {uploader?.battery != null && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">Uploader</p>
          <BatteryBar pct={uploader.battery} />
        </div>
      )}
      {!loop && !uploader && (
        <p className="text-xs text-muted-foreground">No device data</p>
      )}
    </WidgetCard>
  );
}

// ── Device Age ────────────────────────────────────────────────────────────────

export function DeviceAgeWidget({ initialTreatments }: { initialTreatments: Treatment[] }) {
  const { data: treatments = initialTreatments } = useSWR<Treatment[]>(
    "/api/v3/treatments?count=100", fetcher,
    { refreshInterval: 60_000, fallbackData: initialTreatments },
  );

  const sage = calcSAGE(treatments);
  const cage = calcCAGE(treatments);
  const iage = calcIAGE(treatments);
  const bage = calcBAGE(treatments);

  return (
    <WidgetCard title="Device Age">
      <AgeBadge label="Sensor"  hours={sage?.hours ?? null} warnAt={168} urgentAt={192} />
      <AgeBadge label="Cannula" hours={cage?.hours ?? null} warnAt={72}  urgentAt={96}  />
      <AgeBadge label="Insulin" hours={iage?.hours ?? null} warnAt={72}  urgentAt={96}  />
      <AgeBadge label="Battery" hours={bage?.hours ?? null} warnAt={720} urgentAt={1080}/>
    </WidgetCard>
  );
}

// ── Legacy composite (kept for any stale imports) ─────────────────────────────

export function DeviceStatusWidget({
  initialStatuses,
  initialTreatments,
  dia,
  carbsPerHour,
  scheduledBasal,
}: {
  initialStatuses: DeviceStatus[];
  initialTreatments: Treatment[];
  dia?: number;
  carbsPerHour?: number;
  scheduledBasal?: number;
}) {
  return (
    <div className="@container h-full p-1">
      <div className="flex flex-wrap gap-2 h-full content-start">
        <div className="flex-1 min-w-[130px]">
          <ActiveWidget initialTreatments={initialTreatments} dia={dia} carbsPerHour={carbsPerHour} />
        </div>
        <div className="flex-1 min-w-[130px]">
          <PumpWidget initialStatuses={initialStatuses} initialTreatments={initialTreatments} scheduledBasal={scheduledBasal} />
        </div>
        <div className="flex-1 min-w-[130px]">
          <LoopWidget initialStatuses={initialStatuses} />
        </div>
        <div className="flex-1 min-w-[130px]">
          <DeviceAgeWidget initialTreatments={initialTreatments} />
        </div>
      </div>
    </div>
  );
}
