"use server";

import { sendPushoverRouted } from "@/lib/nightscout/pushover";
import { sendTelegram }        from "@/lib/nightscout/telegram";
import { sendIFTTTAlarm, sendIFTTTAnnouncement } from "@/lib/nightscout/ifttt";

export async function sendAlarmNotification(
  level: "urgent" | "warn",
  bgDisplay: string,
  direction: string
) {
  const isUrgent = level === "urgent";
  const title    = isUrgent ? "URGENT BG Alert" : "BG Alert";
  const message  = `${bgDisplay} ${direction}`;

  // Alarm key takes priority; fall back to PUSHOVER_USER_KEY
  const alarmKey = process.env.PUSHOVER_ALARM_KEY ?? undefined;

  await Promise.all([
    sendPushoverRouted({
      title,
      message,
      priority: isUrgent ? 1 : 0,
      sound:    isUrgent ? "siren" : "pushover",
    }, alarmKey),
    sendTelegram({
      text:       `<b>${title}</b>\n${message}`,
      parse_mode: "HTML",
    }),
    sendIFTTTAlarm(level, bgDisplay, direction),
  ]);
}

export async function sendAnnouncementNotification(message: string) {
  const announcementKey = process.env.PUSHOVER_ANNOUNCEMENT_KEY ?? undefined;

  await Promise.all([
    sendPushoverRouted({
      title:    "Nightscout Announcement",
      message,
      priority: 0,
      sound:    "none",
    }, announcementKey),
    sendTelegram({
      text:       `<b>Announcement</b>\n${message}`,
      parse_mode: "HTML",
    }),
    sendIFTTTAnnouncement(message),
  ]);
}
