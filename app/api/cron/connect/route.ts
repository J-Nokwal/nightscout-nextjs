import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerConfig } from "@/lib/nightscout/serverConfig";
import { fetchLibreLinkUp } from "@/lib/nightscout/connect/librelinkup";
import { fetchDexcomShare } from "@/lib/nightscout/connect/dexcomshare";
import { verifyApiSecret } from "@/lib/nightscout/apiAuth";
import type { Entry } from "@/types/nightscout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!verifyApiSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cfg = getServerConfig();
  if (!cfg.connectSource) {
    return NextResponse.json({ message: "No CONNECT_SOURCE configured", inserted: 0 });
  }

  let entries: Entry[] = [];

  try {
    switch (cfg.connectSource.toLowerCase()) {
      case "linkup":
        if (!cfg.connectLinkUpUsername || !cfg.connectLinkUpPassword) {
          return NextResponse.json(
            { error: "CONNECT_LINK_UP_USERNAME and CONNECT_LINK_UP_PASSWORD required" },
            { status: 400 }
          );
        }
        entries = await fetchLibreLinkUp({
          username:  cfg.connectLinkUpUsername,
          password:  cfg.connectLinkUpPassword,
          region:    cfg.connectLinkUpRegion,
          patientId: cfg.connectLinkUpPatientId,
          maxCount:  288,
        });
        break;

      case "dexcomshare":
        if (!cfg.connectShareAccountName || !cfg.connectSharePassword) {
          return NextResponse.json(
            { error: "CONNECT_SHARE_ACCOUNT_NAME and CONNECT_SHARE_PASSWORD required" },
            { status: 400 }
          );
        }
        entries = await fetchDexcomShare({
          accountName: cfg.connectShareAccountName,
          password:    cfg.connectSharePassword,
          region:      cfg.connectShareRegion,
          minutes:     1440,
          maxCount:    288,
        });
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported CONNECT_SOURCE: ${cfg.connectSource}` },
          { status: 400 }
        );
    }

    if (!entries.length) {
      return NextResponse.json({ message: "No entries returned from source", inserted: 0 });
    }

    // Only insert entries newer than what's already in the DB
    const latest     = await db.getEntries({ count: 1 });
    const latestDate = latest[0]?.date ?? 0;
    const newEntries = entries.filter((e) => e.date > latestDate);

    if (newEntries.length) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      await db.createEntries(newEntries.map(({ _id, ...e }) => e));
    }

    return NextResponse.json({
      message:  "OK",
      source:   cfg.connectSource,
      inserted: newEntries.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
