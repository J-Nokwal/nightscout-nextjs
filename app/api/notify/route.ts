import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/nightscout/apiAuth";
import { sendPushover, PushoverPriority } from "@/lib/nightscout/pushover";

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, message, priority, sound, url, url_title } = await req.json();
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const sent = await sendPushover({
    title:     title ?? "Nightscout",
    message,
    priority:  (priority as PushoverPriority) ?? 0,
    sound,
    url,
    url_title,
  });

  if (!sent) {
    const configured = !!(process.env.PUSHOVER_APP_TOKEN && process.env.PUSHOVER_USER_KEY);
    return NextResponse.json(
      { error: configured ? "Pushover delivery failed" : "Pushover not configured" },
      { status: configured ? 502 : 503 }
    );
  }

  return NextResponse.json({ ok: true });
}
