// Server-side startup validation — called once when the DB adapter loads.
// Logs clear errors for missing required environment variables.

interface EnvSpec {
  key:      string;
  required: boolean;
  hint:     string;
}

const ENV_SPECS: EnvSpec[] = [
  { key: "MONGODB_URI",    required: false, hint: "Required when DB_ADAPTER=mongo (default)" },
  { key: "AUTH_SECRET",    required: true,  hint: "Random string for Auth.js session signing" },
  { key: "API_SECRET",     required: true,  hint: "Min 12-char secret for CGM uploaders (xDrip+, Loop)" },
  { key: "AUTH_URL",       required: false, hint: "Full URL of this server, e.g. http://localhost:3000" },
  { key: "DB_ADAPTER",     required: false, hint: "mongo (default) or postgres" },
  { key: "POSTGRESQL_URI", required: false, hint: "Required when DB_ADAPTER=postgres" },
  { key: "SHARE_TOKEN",    required: false, hint: "Token for /follow/<token> read-only URL" },
  { key: "REDIS_URL",      required: false, hint: "Optional Redis cache (e.g. redis://localhost:6379)" },
  { key: "PUSHOVER_APP_TOKEN",  required: false, hint: "Pushover application token" },
  { key: "PUSHOVER_USER_KEY",   required: false, hint: "Pushover user key" },
  { key: "TELEGRAM_BOT_TOKEN",  required: false, hint: "Telegram bot token" },
  { key: "TELEGRAM_CHAT_ID",    required: false, hint: "Telegram chat/user ID" },
];

let validated = false;

export function validateEnv(): void {
  if (validated) return;
  validated = true;

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const { key, required, hint } of ENV_SPECS) {
    const val = process.env[key];
    if (!val) {
      if (required) errors.push(`  ✗ ${key} — ${hint}`);
      // Skip non-required warnings to keep logs clean
    }
  }

  // Adapter-specific checks
  const adapter = process.env.DB_ADAPTER ?? "mongo";
  if (adapter === "mongo" && !process.env.MONGODB_URI) {
    errors.push("  ✗ MONGODB_URI — Required for DB_ADAPTER=mongo");
  }
  if (adapter === "postgres" && !process.env.POSTGRESQL_URI) {
    errors.push("  ✗ POSTGRESQL_URI — Required for DB_ADAPTER=postgres");
  }

  // API_SECRET length check
  const apiSecret = process.env.API_SECRET ?? "";
  if (apiSecret && apiSecret.length < 12) {
    warnings.push("  ⚠ API_SECRET is shorter than 12 characters — CGM uploaders may reject it");
  }

  if (errors.length) {
    console.error("\n[Nightscout] ❌ Missing required environment variables:\n" + errors.join("\n"));
    console.error("  Set these in .env.local or your deployment environment.\n");
    if (process.env.NODE_ENV === "production") throw new Error("Missing required environment variables");
  }
  if (warnings.length) {
    console.warn("\n[Nightscout] ⚠ Environment warnings:\n" + warnings.join("\n") + "\n");
  }
}
