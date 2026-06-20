import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin, isAuthorized } from "@/lib/nightscout/apiAuth";
import { DEFAULT_SETTINGS } from "@/lib/nightscout/settings";
import { getServerConfig } from "@/lib/nightscout/serverConfig";
import type { NightscoutSettings } from "@/lib/nightscout/settings";

export async function GET(req: NextRequest) {
  if (!await isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const cfg    = getServerConfig();
    const stored = await db.getUISettings();

    // Server env vars set defaults; stored UI settings override them
    const envDefaults: Partial<NightscoutSettings> = {
      unit:       cfg.displayUnits,
      timeFormat: cfg.timeFormat,
      nightMode:  cfg.nightMode || undefined,
      urgentLow:  cfg.bgLow,
      low:        cfg.bgTargetBottom,
      high:       cfg.bgTargetTop,
      urgentHigh: cfg.bgHigh,
      ...(cfg.customTitle !== "Nightscout" ? { customTitle: cfg.customTitle } : {}),
    };

    return NextResponse.json({ ...DEFAULT_SETTINGS, ...envDefaults, ...(stored ?? {}) });
  } catch {
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function PUT(req: NextRequest) {
  if (!await isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body   = await req.json() as Partial<NightscoutSettings>;
    const merged: NightscoutSettings = { ...DEFAULT_SETTINGS, ...body };
    await db.saveUISettings(merged);
    return NextResponse.json(merged);
  } catch {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
