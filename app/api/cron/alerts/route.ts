import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerConfig } from "@/lib/nightscout/serverConfig";
import { sendPushoverRouted } from "@/lib/nightscout/pushover";
import { sendTelegram }       from "@/lib/nightscout/telegram";
import { sendIFTTTAlarm }     from "@/lib/nightscout/ifttt";
import { calcSAGE, calcCAGE, calcIAGE, calcBAGE } from "@/lib/nightscout/deviceAge";
import { verifyApiSecret } from "@/lib/nightscout/apiAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function notify(title: string, message: string, isUrgent: boolean, alarmKey: string | null) {
  const text = `<b>${title}</b>\n${message}`;
  await Promise.all([
    sendPushoverRouted({ title, message, priority: isUrgent ? 1 : 0 }, alarmKey),
    sendTelegram({ text, parse_mode: "HTML" }),
    sendIFTTTAlarm(isUrgent ? "urgent" : "warn", message, ""),
  ]);
}

export async function GET(req: NextRequest) {
  if (!verifyApiSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cfg      = getServerConfig();
  const now      = Date.now();
  const triggered: string[] = [];
  const alarmKey = cfg.pushoverAlarmKey;

  const treatments = await db.getTreatments({ count: 500 }).catch(() => []);

  if (cfg.cageEnableAlerts) {
    const cage = calcCAGE(treatments, now);
    if (cage != null && cage.hours >= cfg.cageUrgent) {
      await notify("CAGE: Cannula Overdue", `Cannula is ${cage.display} old — change urgently`, true, alarmKey);
      triggered.push("cage-urgent");
    } else if (cage != null && cage.hours >= cfg.cageWarn) {
      await notify("CAGE: Cannula Due", `Cannula is ${cage.display} old`, false, alarmKey);
      triggered.push("cage-warn");
    }
  }

  if (cfg.sageEnableAlerts) {
    const sage = calcSAGE(treatments, now);
    if (sage != null && sage.hours >= cfg.sageUrgent) {
      await notify("SAGE: Sensor Overdue", `Sensor is ${sage.display} old — change urgently`, true, alarmKey);
      triggered.push("sage-urgent");
    } else if (sage != null && sage.hours >= cfg.sageWarn) {
      await notify("SAGE: Sensor Due", `Sensor is ${sage.display} old`, false, alarmKey);
      triggered.push("sage-warn");
    }
  }

  if (cfg.iageEnableAlerts) {
    const iage = calcIAGE(treatments, now);
    if (iage != null && iage.hours >= cfg.iageUrgent) {
      await notify("IAGE: Insulin Overdue", `Insulin reservoir is ${iage.display} old`, true, alarmKey);
      triggered.push("iage-urgent");
    } else if (iage != null && iage.hours >= cfg.iageWarn) {
      await notify("IAGE: Insulin Due", `Insulin reservoir is ${iage.display} old`, false, alarmKey);
      triggered.push("iage-warn");
    }
  }

  if (cfg.bageEnableAlerts) {
    const bage = calcBAGE(treatments, now);
    if (bage != null && bage.hours >= cfg.bageUrgent) {
      await notify("BAGE: Battery Overdue", `Pump battery is ${bage.display} old`, true, alarmKey);
      triggered.push("bage-urgent");
    } else if (bage != null && bage.hours >= cfg.bageWarn) {
      await notify("BAGE: Battery Due", `Pump battery is ${bage.display} old`, false, alarmKey);
      triggered.push("bage-warn");
    }
  }

  if (cfg.upbatEnableAlerts) {
    const statuses = await db.getDeviceStatuses({ count: 1 }).catch(() => []);
    const pct = statuses[0]?.uploader?.battery;
    if (pct != null) {
      if (pct <= cfg.upbatUrgent) {
        await notify("Uploader Battery Critical", `Battery at ${pct}%`, true, alarmKey);
        triggered.push("upbat-urgent");
      } else if (pct <= cfg.upbatWarn) {
        await notify("Uploader Battery Low", `Battery at ${pct}%`, false, alarmKey);
        triggered.push("upbat-warn");
      }
    }
  }

  if (cfg.pumpEnableAlerts) {
    const statuses = await db.getDeviceStatuses({ count: 1 }).catch(() => []);
    const pump = statuses[0]?.pump;
    if (pump) {
      if (pump.reservoir != null) {
        if (pump.reservoir <= cfg.pumpUrgentRes) {
          await notify("Pump: Reservoir Critical", `Only ${pump.reservoir}U remaining`, true, alarmKey);
          triggered.push("pump-res-urgent");
        } else if (pump.reservoir <= cfg.pumpWarnRes) {
          await notify("Pump: Reservoir Low", `${pump.reservoir}U remaining`, false, alarmKey);
          triggered.push("pump-res-warn");
        }
      }
      if (cfg.pumpWarnOnSuspend && pump.status?.status === "suspended") {
        await notify("Pump Suspended", "Pump is currently suspended", true, alarmKey);
        triggered.push("pump-suspended");
      }
    }
  }

  if (cfg.loopEnableAlerts || cfg.openapsEnableAlerts) {
    const statuses = await db.getDeviceStatuses({ count: 1 }).catch(() => []);
    const status = statuses[0];
    const openapsData = status?.openaps as Record<string, unknown> | undefined;
    const loopTs = status?.loop?.timestamp
      ?? (typeof openapsData?.lastLoopDate === "string" ? openapsData.lastLoopDate : null);
    const lastLoopMs = loopTs ? new Date(loopTs).getTime() : null;

    if (lastLoopMs != null) {
      const minsSilent = (now - lastLoopMs) / 60_000;
      const urgentMins = cfg.loopEnableAlerts ? cfg.loopUrgent : cfg.openapsUrgent;
      const warnMins   = cfg.loopEnableAlerts ? cfg.loopWarn   : cfg.openapsWarn;

      if (minsSilent >= urgentMins) {
        await notify("Loop Offline", `Loop has not run in ${Math.round(minsSilent)} min`, true, alarmKey);
        triggered.push("loop-urgent");
      } else if (minsSilent >= warnMins) {
        await notify("Loop Warning", `Loop has not run in ${Math.round(minsSilent)} min`, false, alarmKey);
        triggered.push("loop-warn");
      }
    }
  }

  return NextResponse.json({ message: "OK", triggered, checkedAt: new Date().toISOString() });
}
