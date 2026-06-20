export interface TelegramMessage {
  text: string;
  parse_mode?: "HTML" | "Markdown";
}

export async function sendTelegram(msg: TelegramMessage): Promise<boolean> {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: msg.text, parse_mode: msg.parse_mode ?? "HTML" }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
