/**
 * Redis cache layer.
 *
 * Supports two backends (auto-detected from env vars):
 *   1. Standard Redis  — via ioredis  (REDIS_URL=redis://... or rediss://...)
 *   2. Upstash REST    — via fetch()   (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
 *
 * All public helpers (cacheGet / cacheSet / cacheDel / cacheDelPattern) are
 * no-ops when neither env var is set, so the app degrades gracefully.
 */

import Redis from "ioredis";

// ── Upstash HTTP REST client ─────────────────────────────────────────────────

type UpstashResult<T = unknown> = { result: T; error?: string };

async function upstashCmd<T = unknown>(...args: (string | number)[]): Promise<T | null> {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL;
  const token   = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!baseUrl || !token) return null;
  try {
    const res = await fetch(baseUrl, {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      // Never keep alive — Upstash REST is HTTP/HTTPS, no persistent TCP needed
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as UpstashResult<T>;
    if (json.error) return null;
    return json.result ?? null;
  } catch {
    return null;
  }
}

const isUpstash =
  !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

// ── ioredis client (standard Redis / Upstash rediss://) ─────────────────────

let client: Redis | null = null;
let failed = false;

function getRedis(): Redis | null {
  if (isUpstash) return null;      // using HTTP REST instead
  if (failed)    return null;
  if (client)    return client;
  const url = process.env.REDIS_URL;
  if (!url) return null;

  client = new Redis(url, {
    lazyConnect:          true,
    maxRetriesPerRequest: 1,
    connectTimeout:       3000,
    enableOfflineQueue:   false,
  });

  client.on("error", (err: Error) => {
    console.warn("[Redis] connection error:", err.message);
    failed = true;
    client = null;
  });

  return client;
}

// ── Public helpers ───────────────────────────────────────────────────────────

export async function cacheGet(key: string): Promise<string | null> {
  if (isUpstash) return upstashCmd<string>("GET", key);
  const r = getRedis();
  if (!r) return null;
  try { return await r.get(key); } catch { return null; }
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (isUpstash) { await upstashCmd("SET", key, value, "EX", ttlSeconds); return; }
  const r = getRedis();
  if (!r) return;
  try { await r.set(key, value, "EX", ttlSeconds); } catch { /* redis is optional */ }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (isUpstash) { await upstashCmd("DEL", ...keys); return; }
  const r = getRedis();
  if (!r) return;
  try { await r.del(...keys); } catch { /* ignore */ }
}

/** Delete all keys matching a glob pattern.
 *  ioredis: uses SCAN to avoid blocking.
 *  Upstash:  uses SCAN via REST (supported by Upstash). */
export async function cacheDelPattern(pattern: string): Promise<void> {
  if (isUpstash) {
    // Upstash supports SCAN via REST
    let cursor = 0;
    const keys: string[] = [];
    do {
      const res = await upstashCmd<[number, string[]]>("SCAN", cursor, "MATCH", pattern, "COUNT", 100);
      if (!res) break;
      cursor = res[0];
      keys.push(...res[1]);
    } while (cursor !== 0);
    if (keys.length) await upstashCmd("DEL", ...keys);
    return;
  }
  const r = getRedis();
  if (!r) return;
  try {
    const keys: string[] = [];
    let cursor = "0";
    do {
      const [next, batch] = await r.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = next;
      keys.push(...batch);
    } while (cursor !== "0");
    if (keys.length) await r.del(...keys);
  } catch { /* ignore */ }
}
