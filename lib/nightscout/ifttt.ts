export async function sendIFTTT(opts: {
  key:    string;
  event:  string;
  value1?: string;
  value2?: string;
  value3?: string;
}): Promise<boolean> {
  try {
    const res = await fetch(
      `https://maker.ifttt.com/trigger/${encodeURIComponent(opts.event)}/with/key/${opts.key}`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ value1: opts.value1 ?? "", value2: opts.value2 ?? "", value3: opts.value3 ?? "" }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendIFTTTAlarm(level: string, bgDisplay: string, direction: string): Promise<void> {
  const keys = (process.env.MAKER_KEY ?? "").split(/\s+/).filter(Boolean);
  if (!keys.length) return;
  await Promise.all(
    keys.map((key) => sendIFTTT({ key, event: "ns_alarm", value1: level, value2: bgDisplay, value3: direction }))
  );
}

export async function sendIFTTTAnnouncement(message: string): Promise<void> {
  // Use MAKER_ANNOUNCEMENT_KEY if set, fall back to MAKER_KEY
  const announcementKeys = (process.env.MAKER_ANNOUNCEMENT_KEY ?? "").split(/\s+/).filter(Boolean);
  const fallbackKeys     = (process.env.MAKER_KEY ?? "").split(/\s+/).filter(Boolean);
  const keys = announcementKeys.length ? announcementKeys : fallbackKeys;
  if (!keys.length) return;
  await Promise.all(
    keys.map((key) => sendIFTTT({ key, event: "ns_announcement", value1: message }))
  );
}
