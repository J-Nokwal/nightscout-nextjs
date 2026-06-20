export type PushoverPriority = -2 | -1 | 0 | 1 | 2;

export interface PushoverMessage {
  title: string;
  message: string;
  priority?: PushoverPriority;
  sound?: string;
  url?: string;
  url_title?: string;
}

export async function sendPushover(msg: PushoverMessage): Promise<boolean> {
  const token = process.env.PUSHOVER_APP_TOKEN;
  const user  = process.env.PUSHOVER_USER_KEY;
  if (!token || !user) return false;
  return sendPushoverToUser(token, user, msg);
}

/**
 * Send to an explicit user/group key, e.g. PUSHOVER_ALARM_KEY or PUSHOVER_ANNOUNCEMENT_KEY.
 * Falls back to PUSHOVER_USER_KEY when keyOverride is null/undefined.
 */
export async function sendPushoverRouted(
  msg: PushoverMessage,
  keyOverride?: string | null
): Promise<boolean> {
  const token = process.env.PUSHOVER_APP_TOKEN;
  const user  = keyOverride ?? process.env.PUSHOVER_USER_KEY;
  if (!token || !user) return false;
  return sendPushoverToUser(token, user, msg);
}

async function sendPushoverToUser(token: string, user: string, msg: PushoverMessage): Promise<boolean> {

  const body = new URLSearchParams({
    token,
    user,
    title:    msg.title,
    message:  msg.message,
    priority: String(msg.priority ?? 0),
  });
  if (msg.sound)     body.set("sound", msg.sound);
  if (msg.url)       body.set("url", msg.url);
  if (msg.url_title) body.set("url_title", msg.url_title);

  // Priority 2 requires retry + expire
  if (msg.priority === 2) {
    body.set("retry",  "60");
    body.set("expire", "3600");
  }

  try {
    const res = await fetch("https://api.pushover.net/1/messages.json", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    return res.ok;
  } catch {
    return false;
  }
}
