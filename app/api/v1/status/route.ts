import { NextResponse } from "next/server";
import { withCors, corsOptions } from "@/lib/nightscout/cors";
import { getServerConfig } from "@/lib/nightscout/serverConfig";

export async function OPTIONS() { return corsOptions(); }

// Nightscout status.json — uploaders call this to verify server connectivity
export async function GET() {
  const cfg = getServerConfig();
  return withCors(NextResponse.json({
    status: "ok",
    name: "nightscout-nextjs",
    version: "0.1.0",
    serverTime: new Date().toISOString(),
    apiEnabled: true,
    careportalEnabled: true,
    head: "n/a",
    settings: {
      units:        cfg.displayUnits,
      timeFormat:   cfg.timeFormat === "12" ? 12 : 24,
      nightMode:    cfg.nightMode,
      editMode:     true,
      showRawbg:    "never",
      customTitle:  cfg.customTitle,
      theme:        "default",
      alarmUrgentHigh:     cfg.alarmUrgentHigh,
      alarmHigh:           cfg.alarmHigh,
      alarmLow:            cfg.alarmLow,
      alarmUrgentLow:      cfg.alarmUrgentLow,
      alarmUrgentHighMins: [30, 60, 90, 120],
      alarmHighMins:       [30, 60, 90, 120],
      alarmLowMins:        [15, 30, 45, 60],
      alarmUrgentLowMins:  [15, 30, 45],
      alarmTimeagoWarn:        cfg.alarmTimeagoWarn,
      alarmTimeagoWarnMins:    cfg.alarmTimeagoWarnMins,
      alarmTimeagoUrgent:      cfg.alarmTimeagoUrgent,
      alarmTimeagoUrgentMins:  cfg.alarmTimeagoUrgentMins,
      enable: [
        "careportal", "boluscalc", "food", "rawbg", "iob", "cob",
        "basal", "ar2", "simplealarms", "profile", "devicestatus",
        "pump", "openaps", "loop", "sage", "cage", "iage", "bage", "upbat",
        "pushover", "treatmentnotify",
        ...cfg.enabledPlugins,
      ].filter((p) => !cfg.disabledPlugins.includes(p)),
    },
    extendedSettings: {
      devicestatus: {
        advanced: cfg.devicestatusAdvanced,
      },
    },
    authorized: null,
  }));
}
