import type { NightscoutDB } from "@/lib/db/models";
import { cacheGet, cacheSet, cacheDelPattern, cacheDel } from "@/lib/cache/redis";

// TTLs in seconds — match SWR refresh intervals
const TTL = {
  entries:      55,
  treatments:   55,
  devicestatus: 55,
  profile:      300,
  lastModified: 30,
} as const;

function key(...parts: (string | number | undefined | null)[]): string {
  return "ns:" + parts.map((p) => (p == null ? "" : String(p))).join(":");
}

async function cached<T>(cacheKey: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const hit = await cacheGet(cacheKey);
  if (hit !== null) return JSON.parse(hit) as T;
  const result = await fn();
  await cacheSet(cacheKey, JSON.stringify(result), ttl);
  return result;
}

/**
 * Wraps any NightscoutDB adapter with an optional Redis cache layer.
 * Reads are cached; writes invalidate the relevant collection's keys.
 * If Redis is unavailable all calls fall through to the underlying adapter.
 */
export function withCache(db: NightscoutDB): NightscoutDB {
  return {

    // ── Entries ──────────────────────────────────────────────────────────────

    getEntries(opts = {}) {
      const k = key("entries", opts.count, opts.dateFrom, opts.dateTo, JSON.stringify(opts.find ?? {}));
      return cached(k, TTL.entries, () => db.getEntries(opts));
    },

    getEntryById(id) {
      const k = key("entries", "id", id);
      return cached(k, TTL.entries, () => db.getEntryById(id));
    },

    async createEntry(entry) {
      const result = await db.createEntry(entry);
      await cacheDelPattern("ns:entries:*");
      await cacheDel("ns:lastmodified");
      return result;
    },

    async createEntries(entries) {
      const result = await db.createEntries(entries);
      await cacheDelPattern("ns:entries:*");
      await cacheDel("ns:lastmodified");
      return result;
    },

    async updateEntry(id, update) {
      const result = await db.updateEntry(id, update);
      await cacheDelPattern("ns:entries:*");
      await cacheDel("ns:lastmodified");
      return result;
    },

    async deleteEntry(id) {
      await db.deleteEntry(id);
      await cacheDelPattern("ns:entries:*");
      await cacheDel("ns:lastmodified");
    },

    // ── Treatments ────────────────────────────────────────────────────────────

    getTreatments(opts = {}) {
      const k = key("treatments", opts.count, opts.skip, opts.dateFrom, JSON.stringify(opts.find ?? {}));
      return cached(k, TTL.treatments, () => db.getTreatments(opts));
    },

    getTreatmentById(id) {
      const k = key("treatments", "id", id);
      return cached(k, TTL.treatments, () => db.getTreatmentById(id));
    },

    async createTreatment(t) {
      const result = await db.createTreatment(t);
      await cacheDelPattern("ns:treatments:*");
      await cacheDel("ns:lastmodified");
      return result;
    },

    async updateTreatment(id, t) {
      const result = await db.updateTreatment(id, t);
      await cacheDelPattern("ns:treatments:*");
      await cacheDel("ns:lastmodified");
      return result;
    },

    async deleteTreatment(id) {
      await db.deleteTreatment(id);
      await cacheDelPattern("ns:treatments:*");
      await cacheDel("ns:lastmodified");
    },

    // ── Device Status ─────────────────────────────────────────────────────────

    getDeviceStatuses(opts = {}) {
      const k = key("devicestatus", opts.count, opts.dateFrom);
      return cached(k, TTL.devicestatus, () => db.getDeviceStatuses(opts));
    },

    getDeviceStatusById(id) {
      const k = key("devicestatus", "id", id);
      return cached(k, TTL.devicestatus, () => db.getDeviceStatusById(id));
    },

    async createDeviceStatus(status) {
      const result = await db.createDeviceStatus(status);
      await cacheDelPattern("ns:devicestatus:*");
      await cacheDel("ns:lastmodified");
      return result;
    },

    async deleteDeviceStatus(id) {
      await db.deleteDeviceStatus(id);
      await cacheDelPattern("ns:devicestatus:*");
      await cacheDel("ns:lastmodified");
    },

    // ── Profiles ──────────────────────────────────────────────────────────────

    getProfiles(opts = {}) {
      const k = key("profile", "list", opts.count, opts.dateFrom);
      return cached(k, TTL.profile, () => db.getProfiles(opts));
    },

    getActiveProfile() {
      return cached(key("profile", "active"), TTL.profile, () => db.getActiveProfile());
    },

    getProfileById(id) {
      const k = key("profile", "id", id);
      return cached(k, TTL.profile, () => db.getProfileById(id));
    },

    async createProfile(profile) {
      const result = await db.createProfile(profile);
      await cacheDelPattern("ns:profile:*");
      await cacheDel("ns:lastmodified");
      return result;
    },

    async updateProfile(id, profile) {
      const result = await db.updateProfile(id, profile);
      await cacheDelPattern("ns:profile:*");
      await cacheDel("ns:lastmodified");
      return result;
    },

    // ── UI Settings ──────────────────────────────────────────────────────────

    getUISettings() {
      return cached(key("ui_settings"), 300, () => db.getUISettings());
    },

    async saveUISettings(settings) {
      await db.saveUISettings(settings);
      await cacheDel(key("ui_settings"));
    },

    // ── Activity ──────────────────────────────────────────────────────────────

    getActivities(opts = {}) {
      const k = key("activity", "list", opts.count, opts.dateFrom);
      return cached(k, TTL.treatments, () => db.getActivities(opts));
    },

    getActivityById(id) {
      const k = key("activity", "id", id);
      return cached(k, TTL.treatments, () => db.getActivityById(id));
    },

    async createActivity(activity) {
      const result = await db.createActivity(activity);
      await cacheDelPattern("ns:activity:*");
      return result;
    },

    async deleteActivity(id) {
      await db.deleteActivity(id);
      await cacheDelPattern("ns:activity:*");
    },

    // ── Meta ──────────────────────────────────────────────────────────────────

    getLastModified() {
      return cached(key("lastmodified"), TTL.lastModified, () => db.getLastModified());
    },
  };
}
