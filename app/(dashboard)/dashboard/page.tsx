import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { BGWidget } from "@/components/dashboard/BGWidget";
import { ChartWidget } from "@/components/dashboard/ChartWidget";
import {
  ActiveWidget,
  PumpWidget,
  LoopWidget,
  DeviceAgeWidget,
} from "@/components/dashboard/DeviceStatus";
import { TIRWidget } from "@/components/dashboard/TIRWidget";
import { AutoDashboardGrid } from "@/components/dashboard/DashboardGrid";
import { calcIOB } from "@/lib/nightscout/iob";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [entries, statuses, treatments, profiles] = await Promise.all([
    db.getEntries({ count: 288 }).catch(() => []),
    db.getDeviceStatuses({ count: 1 }).catch(() => []),
    db.getTreatments({ count: 100 }).catch(() => []),
    db.getProfiles().catch(() => []),
  ]);

  const profile   = profiles[0];
  const storeName = profile?.defaultProfile ?? "Default";
  const store     = profile?.store?.[storeName];
  const dia       = store?.dia ?? 6;
  const carbsPerHour = store?.carbs_hr ?? 20;

  // Current ISF and carb ratio at current time of day
  const now    = new Date();
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60;

  function currentValue(schedule: { timeAsSeconds: number; value: number }[] | undefined) {
    if (!schedule?.length) return undefined;
    const sorted = [...schedule].sort((a, b) => a.timeAsSeconds - b.timeAsSeconds);
    return [...sorted].reverse().find((e) => e.timeAsSeconds <= nowSec)?.value ?? sorted[0].value;
  }

  const isf      = currentValue(store?.sens) ?? 50;
  const carbRatio = currentValue(store?.carbratio) ?? 10;
  const targetBG = currentValue(store?.target_low) != null ? Math.round(
    ((currentValue(store?.target_low) ?? 80) + (currentValue(store?.target_high) ?? 140)) / 2
  ) : 110;
  const scheduledBasal = currentValue(store?.basal);

  const { iob } = calcIOB(treatments, dia);

  return (
    <AutoDashboardGrid
      widgets={{
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
          <LoopWidget
            initialStatuses={statuses}
          />
        ),
        devage: (
          <DeviceAgeWidget
            initialTreatments={treatments}
          />
        ),
      }}
    />
  );
}
