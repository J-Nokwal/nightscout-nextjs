import { Pool, type PoolClient } from "pg";
import type { NightscoutDB } from "@/lib/db/models";
import type { Entry, Treatment, DeviceStatus, Profile, Activity } from "@/types/nightscout";
import type { NightscoutSettings } from "@/lib/nightscout/settings";

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;
  const uri = process.env.POSTGRESQL_URI;
  if (!uri) throw new Error("POSTGRESQL_URI is not set");
  pool = new Pool({ connectionString: uri });
  return pool;
}

async function withClient<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await getPool().connect();
  try {
    return await fn(c);
  } finally {
    c.release();
  }
}

// Run scripts/pg-migrate.sql once before first use.

export const postgresAdapter: NightscoutDB = {

  // ── Entries ────────────────────────────────────────────────────────────────

  async getEntries({ count = 10, dateFrom, dateTo, find = {} } = {}) {
    return withClient(async (c) => {
      const conditions: string[] = [];
      const params: unknown[] = [];
      let i = 1;

      if (dateFrom != null) { conditions.push(`date >= $${i++}`); params.push(dateFrom); }
      if (dateTo   != null) { conditions.push(`date <= $${i++}`); params.push(dateTo); }
      if (find.type)        { conditions.push(`type = $${i++}`);  params.push(find.type); }

      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
      params.push(count);
      const res = await c.query(
        `SELECT * FROM entries ${where} ORDER BY date DESC LIMIT $${i}`,
        params,
      );
      return res.rows.map(rowToEntry);
    });
  },

  async getEntryById(id) {
    return withClient(async (c) => {
      const res = await c.query("SELECT * FROM entries WHERE id = $1", [id]);
      if (!res.rows[0]) return null;
      return rowToEntry(res.rows[0]);
    });
  },

  async createEntry(entry) {
    return withClient(async (c) => {
      const res = await c.query(
        `INSERT INTO entries
           (date, date_string, type, sgv, mbg, direction, noise, filtered, unfiltered, rssi, device)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [
          entry.date, entry.dateString, entry.type,
          entry.sgv ?? null, entry.mbg ?? null,
          entry.direction ?? null, entry.noise ?? null,
          entry.filtered ?? null, entry.unfiltered ?? null,
          entry.rssi ?? null, entry.device ?? null,
        ],
      );
      return rowToEntry(res.rows[0]);
    });
  },

  async createEntries(entries) {
    return Promise.all(entries.map((e) => postgresAdapter.createEntry(e)));
  },

  async updateEntry(id, update) {
    return withClient(async (c) => {
      const fields = Object.keys(update) as (keyof typeof update)[];
      if (!fields.length) return postgresAdapter.getEntryById(id);
      const setClauses = fields.map((f, i) => `${String(f)} = $${i + 2}`).join(", ");
      const values = fields.map((f) => update[f]);
      const res = await c.query(
        `UPDATE entries SET ${setClauses} WHERE id = $1 RETURNING *`,
        [id, ...values]
      );
      return res.rows[0] ? rowToEntry(res.rows[0]) : null;
    });
  },

  async deleteEntry(id) {
    await withClient((c) => c.query("DELETE FROM entries WHERE id = $1", [id]));
  },

  // ── Treatments ─────────────────────────────────────────────────────────────

  async getTreatments({ count = 10, skip = 0, dateFrom, find = {} } = {}) {
    return withClient(async (c) => {
      const conditions: string[] = [];
      const params: unknown[] = [];
      let i = 1;

      if (find.eventType) { conditions.push(`event_type = $${i++}`); params.push(find.eventType); }
      if (dateFrom != null) { conditions.push(`created_at >= $${i++}`); params.push(new Date(dateFrom).toISOString()); }

      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
      params.push(skip, count);
      const res = await c.query(
        `SELECT * FROM treatments ${where} ORDER BY created_at DESC OFFSET $${i++} LIMIT $${i}`,
        params,
      );
      return res.rows.map(rowToTreatment);
    });
  },

  async getTreatmentById(id) {
    return withClient(async (c) => {
      const res = await c.query("SELECT * FROM treatments WHERE id = $1", [id]);
      if (!res.rows[0]) return null;
      return rowToTreatment(res.rows[0]);
    });
  },

  async createTreatment(t) {
    return withClient(async (c) => {
      const res = await c.query(
        `INSERT INTO treatments
           (event_type, created_at, timestamp, glucose, glucose_type, carbs, protein, fat,
            insulin, units, duration, percent, absolute, rate, entered_by, notes,
            target_top, target_bottom)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         RETURNING *`,
        [
          t.eventType, t.created_at, t.timestamp ?? null,
          t.glucose ?? null, t.glucoseType ?? null,
          t.carbs ?? null, t.protein ?? null, t.fat ?? null,
          t.insulin ?? null, t.units ?? null,
          t.duration ?? null, t.percent ?? null, t.absolute ?? null, t.rate ?? null,
          t.enteredBy ?? null, t.notes ?? null,
          t.targetTop ?? null, t.targetBottom ?? null,
        ],
      );
      return rowToTreatment(res.rows[0]);
    });
  },

  async updateTreatment(id, t) {
    return withClient(async (c) => {
      const colMap: [string, unknown][] = [
        ["insulin",       t.insulin],
        ["carbs",         t.carbs],
        ["glucose",       t.glucose],
        ["duration",      t.duration],
        ["absolute",      t.absolute],
        ["percent",       t.percent],
        ["notes",         t.notes],
        ["target_top",    t.targetTop],
        ["target_bottom", t.targetBottom],
      ];

      const sets: string[] = [];
      const params: unknown[] = [];
      let i = 1;
      for (const [col, val] of colMap) {
        if (val !== undefined) { sets.push(`${col} = $${i++}`); params.push(val); }
      }
      if (!sets.length) throw new Error("Nothing to update");
      params.push(id);
      const res = await c.query(
        `UPDATE treatments SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
        params,
      );
      if (!res.rows[0]) throw new Error(`Treatment ${id} not found`);
      return rowToTreatment(res.rows[0]);
    });
  },

  async deleteTreatment(id) {
    await withClient((c) => c.query("DELETE FROM treatments WHERE id = $1", [id]));
  },

  // ── Device Status ──────────────────────────────────────────────────────────

  async getDeviceStatuses({ count = 1, dateFrom } = {}) {
    return withClient(async (c) => {
      const conditions: string[] = [];
      const params: unknown[] = [];
      let i = 1;
      if (dateFrom != null) { conditions.push(`created_at >= $${i++}`); params.push(new Date(dateFrom).toISOString()); }
      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
      params.push(count);
      const res = await c.query(
        `SELECT * FROM device_status ${where} ORDER BY created_at DESC LIMIT $${i}`,
        params,
      );
      return res.rows.map((row) => ({
        ...(row.data as DeviceStatus),
        _id: String(row.id),
        created_at: row.created_at,
      }));
    });
  },

  async getDeviceStatusById(id) {
    return withClient(async (c) => {
      const res = await c.query("SELECT * FROM device_status WHERE id = $1", [id]);
      if (!res.rows[0]) return null;
      return { ...(res.rows[0].data as DeviceStatus), _id: String(res.rows[0].id), created_at: res.rows[0].created_at };
    });
  },

  async createDeviceStatus(status) {
    return withClient(async (c) => {
      const res = await c.query(
        "INSERT INTO device_status (created_at, data) VALUES ($1, $2) RETURNING *",
        [status.created_at, JSON.stringify(status)],
      );
      return { ...status, _id: String(res.rows[0].id) };
    });
  },

  async deleteDeviceStatus(id) {
    await withClient((c) => c.query("DELETE FROM device_status WHERE id = $1", [id]));
  },

  // ── Profiles ───────────────────────────────────────────────────────────────

  async getProfiles({ count = 100, dateFrom } = {}) {
    return withClient(async (c) => {
      const conditions: string[] = [];
      const params: unknown[] = [];
      let i = 1;
      if (dateFrom != null) { conditions.push(`created_at >= $${i++}`); params.push(new Date(dateFrom).toISOString()); }
      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
      params.push(count);
      const res = await c.query(
        `SELECT * FROM profiles ${where} ORDER BY created_at DESC LIMIT $${i}`,
        params,
      );
      return res.rows.map((row) => ({ ...(row.data as Profile), _id: String(row.id) }));
    });
  },

  async getActiveProfile() {
    return withClient(async (c) => {
      const res = await c.query("SELECT * FROM profiles ORDER BY created_at DESC LIMIT 1");
      if (!res.rows[0]) return null;
      return { ...(res.rows[0].data as Profile), _id: String(res.rows[0].id) };
    });
  },

  async getProfileById(id) {
    return withClient(async (c) => {
      const res = await c.query("SELECT * FROM profiles WHERE id = $1", [id]);
      if (!res.rows[0]) return null;
      return { ...(res.rows[0].data as Profile), _id: String(res.rows[0].id) };
    });
  },

  async createProfile(profile) {
    return withClient(async (c) => {
      const res = await c.query(
        "INSERT INTO profiles (created_at, data) VALUES ($1, $2) RETURNING *",
        [profile.created_at, JSON.stringify(profile)],
      );
      return { ...profile, _id: String(res.rows[0].id) };
    });
  },

  async updateProfile(id, updates) {
    return withClient(async (c) => {
      const res = await c.query(
        `UPDATE profiles SET data = data || $1::jsonb WHERE id = $2 RETURNING *`,
        [JSON.stringify(updates), id],
      );
      if (!res.rows[0]) throw new Error(`Profile ${id} not found`);
      return { ...(res.rows[0].data as Profile), _id: String(res.rows[0].id) };
    });
  },

  // ── Activity ───────────────────────────────────────────────────────────────

  async getActivities({ count = 10, dateFrom } = {}) {
    return withClient(async (c) => {
      const params: unknown[] = [];
      let where = "";
      if (dateFrom != null) { where = "WHERE created_at >= $1"; params.push(new Date(dateFrom).toISOString()); }
      params.push(count);
      const res = await c.query(
        `SELECT * FROM activity ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
        params,
      );
      return res.rows.map((row) => ({ ...(row.data as Activity), _id: String(row.id), created_at: row.created_at }));
    });
  },

  async getActivityById(id) {
    return withClient(async (c) => {
      const res = await c.query("SELECT * FROM activity WHERE id = $1", [id]);
      if (!res.rows[0]) return null;
      return { ...(res.rows[0].data as Activity), _id: String(res.rows[0].id), created_at: res.rows[0].created_at };
    });
  },

  async createActivity(activity) {
    return withClient(async (c) => {
      const res = await c.query(
        "INSERT INTO activity (created_at, data) VALUES ($1, $2) RETURNING *",
        [activity.created_at, JSON.stringify(activity)],
      );
      return { ...activity, _id: String(res.rows[0].id) };
    });
  },

  async deleteActivity(id) {
    await withClient((c) => c.query("DELETE FROM activity WHERE id = $1", [id]));
  },

  // ── UI Settings ────────────────────────────────────────────────────────────

  async getUISettings() {
    return withClient(async (c) => {
      const res = await c.query("SELECT data FROM ui_settings WHERE id = 'default' LIMIT 1");
      if (!res.rows[0]) return null;
      return res.rows[0].data as NightscoutSettings;
    });
  },

  async saveUISettings(settings: NightscoutSettings) {
    await withClient(async (c) => {
      await c.query(
        `INSERT INTO ui_settings (id, data) VALUES ('default', $1)
         ON CONFLICT (id) DO UPDATE SET data = $1`,
        [JSON.stringify(settings)],
      );
    });
  },

  // ── Meta ───────────────────────────────────────────────────────────────────

  async getLastModified() {
    return withClient(async (c) => {
      const [entries, treatments, status, profile] = await Promise.all([
        c.query("SELECT MAX(date) AS ts FROM entries"),
        c.query("SELECT MAX(created_at) AS ts FROM treatments"),
        c.query("SELECT MAX(created_at) AS ts FROM device_status"),
        c.query("SELECT MAX(created_at) AS ts FROM profiles"),
      ]);
      return {
        srvDate: Date.now(),
        collections: {
          entries:      entries.rows[0].ts     ? Number(entries.rows[0].ts)                       : null,
          treatments:   treatments.rows[0].ts  ? new Date(treatments.rows[0].ts).getTime()        : null,
          devicestatus: status.rows[0].ts      ? new Date(status.rows[0].ts).getTime()            : null,
          profile:      profile.rows[0].ts     ? new Date(profile.rows[0].ts).getTime()           : null,
        },
      };
    });
  },
};

// ── Row mappers ───────────────────────────────────────────────────────────────

function rowToEntry(row: Record<string, unknown>): Entry {
  return {
    _id:        String(row.id),
    date:       Number(row.date),
    dateString: row.date_string as string | undefined,
    type:       row.type as Entry["type"],
    sgv:        row.sgv        != null ? Number(row.sgv)        : undefined,
    mbg:        row.mbg        != null ? Number(row.mbg)        : undefined,
    direction:  row.direction  as Entry["direction"] | undefined,
    noise:      row.noise      != null ? Number(row.noise)      : undefined,
    filtered:   row.filtered   != null ? Number(row.filtered)   : undefined,
    unfiltered: row.unfiltered != null ? Number(row.unfiltered) : undefined,
    rssi:       row.rssi       != null ? Number(row.rssi)       : undefined,
    device:     row.device     as string | undefined,
  };
}

function rowToTreatment(row: Record<string, unknown>): Treatment {
  return {
    _id:           String(row.id),
    eventType:     row.event_type    as Treatment["eventType"],
    created_at:    String(row.created_at),
    timestamp:     row.timestamp     != null ? Number(row.timestamp)  : undefined,
    glucose:       row.glucose       != null ? Number(row.glucose)    : undefined,
    glucoseType:   row.glucose_type  as Treatment["glucoseType"]       | undefined,
    carbs:         row.carbs         != null ? Number(row.carbs)      : undefined,
    protein:       row.protein       != null ? Number(row.protein)    : undefined,
    fat:           row.fat           != null ? Number(row.fat)        : undefined,
    insulin:       row.insulin       != null ? Number(row.insulin)    : undefined,
    units:         row.units         as Treatment["units"]             | undefined,
    duration:      row.duration      != null ? Number(row.duration)   : undefined,
    percent:       row.percent       != null ? Number(row.percent)    : undefined,
    absolute:      row.absolute      != null ? Number(row.absolute)   : undefined,
    rate:          row.rate          != null ? Number(row.rate)       : undefined,
    enteredBy:     row.entered_by    as string | undefined,
    notes:         row.notes         as string | undefined,
    targetTop:     row.target_top    != null ? Number(row.target_top)    : undefined,
    targetBottom:  row.target_bottom != null ? Number(row.target_bottom) : undefined,
  };
}
