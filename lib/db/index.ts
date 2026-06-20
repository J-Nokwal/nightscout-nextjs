import type { NightscoutDB } from "@/lib/db/models";
import { validateEnv } from "@/lib/startup";

function loadAdapter(): NightscoutDB {
  validateEnv();
  const adapter = process.env.DB_ADAPTER ?? "mongo";
  /* eslint-disable @typescript-eslint/no-require-imports */
  const base: NightscoutDB = adapter === "postgres"
    ? require("./adapters/postgres").postgresAdapter
    : require("./adapters/mongo").mongoAdapter;
  /* eslint-enable @typescript-eslint/no-require-imports */

  if (process.env.REDIS_URL) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { withCache } = require("./cached") as { withCache: (db: NightscoutDB) => NightscoutDB };
    console.log("[Nightscout] Redis cache enabled");
    return withCache(base);
  }

  return base;
}

export const db: NightscoutDB = loadAdapter();
