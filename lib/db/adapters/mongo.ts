import { MongoClient, Db, ObjectId, Filter, Document } from "mongodb";
import type { NightscoutDB } from "@/lib/db/models";
import type { Entry, Treatment, DeviceStatus, Profile, Activity } from "@/types/nightscout";
import type { NightscoutSettings } from "@/lib/nightscout/settings";

let client: MongoClient | null = null;
let db: Db | null = null;

async function getDb(): Promise<Db> {
  if (db) return db;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  client = new MongoClient(uri);
  await client.connect();
  db = client.db();
  return db;
}

function toId(doc: Record<string, unknown> & { _id?: unknown }) {
  const { _id, ...rest } = doc;
  return { ...rest, _id: _id instanceof ObjectId ? _id.toHexString() : _id };
}

function safeObjectId(id: string): ObjectId | null {
  try { return new ObjectId(id); } catch { return null; }
}

export const mongoAdapter: NightscoutDB = {

  // ── Entries ────────────────────────────────────────────────────────────────

  async getEntries({ count = 10, dateFrom, dateTo, find = {} } = {}) {
    const d = await getDb();
    const filter: Record<string, unknown> = { ...find };
    if (dateFrom != null || dateTo != null) {
      const dateCond: Record<string, number> = {};
      if (dateFrom != null) dateCond.$gte = dateFrom;
      if (dateTo   != null) dateCond.$lte = dateTo;
      filter.date = dateCond;
    }
    const docs = await d.collection("entries").find(filter as Filter<Document>).sort({ date: -1 }).limit(count).toArray();
    return docs.map((doc) => toId(doc as Record<string, unknown> & { _id?: unknown })) as Entry[];
  },

  async getEntryById(id) {
    const d = await getDb();
    const oid = safeObjectId(id);
    if (!oid) return null;
    const doc = await d.collection("entries").findOne({ _id: oid });
    if (!doc) return null;
    return toId(doc as Record<string, unknown> & { _id?: unknown }) as Entry;
  },

  async createEntry(entry) {
    const d = await getDb();
    // Strip _id so Mongo generates a fresh ObjectId — prevents duplicate key errors on re-uploads
    const { _id, ...doc } = entry as typeof entry & { _id?: unknown };
    void _id;
    const result = await d.collection("entries").insertOne(doc);
    return { ...doc, _id: result.insertedId.toHexString() };
  },

  async createEntries(entries) {
    const d = await getDb();
    const docs = entries.map(({ _id, ...e }: typeof entries[0] & { _id?: unknown }) => { void _id; return e; });
    const result = await d.collection("entries").insertMany(docs);
    return docs.map((e, i) => ({ ...e, _id: result.insertedIds[i].toHexString() }));
  },

  async updateEntry(id, update) {
    const d = await getDb();
    const oid = safeObjectId(id);
    if (!oid) return null;
    const doc = await d.collection("entries").findOneAndUpdate(
      { _id: oid },
      { $set: update },
      { returnDocument: "after" }
    );
    if (!doc) return null;
    return toId(doc as Record<string, unknown> & { _id?: unknown }) as Entry;
  },

  async deleteEntry(id) {
    const d = await getDb();
    const oid = safeObjectId(id);
    if (oid) await d.collection("entries").deleteOne({ _id: oid });
  },

  // ── Treatments ─────────────────────────────────────────────────────────────

  async getTreatments({ count = 10, skip = 0, dateFrom, find = {} } = {}) {
    const d = await getDb();
    const filter: Record<string, unknown> = { ...find };
    if (dateFrom != null) {
      filter.created_at = { $gte: new Date(dateFrom).toISOString() };
    }
    const docs = await d
      .collection("treatments")
      .find(filter as Filter<Document>)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(count)
      .toArray();
    return docs.map((doc) => toId(doc as Record<string, unknown> & { _id?: unknown })) as Treatment[];
  },

  async getTreatmentById(id) {
    const d = await getDb();
    const oid = safeObjectId(id);
    if (!oid) return null;
    const doc = await d.collection("treatments").findOne({ _id: oid });
    if (!doc) return null;
    return toId(doc as Record<string, unknown> & { _id?: unknown }) as Treatment;
  },

  async createTreatment(treatment) {
    const d = await getDb();
    const { _id, ...doc } = treatment as typeof treatment & { _id?: unknown };
    void _id;
    const result = await d.collection("treatments").insertOne(doc);
    return { ...doc, _id: result.insertedId.toHexString() };
  },

  async updateTreatment(id, treatment) {
    const d = await getDb();
    const oid = safeObjectId(id);
    if (!oid) throw new Error(`Invalid id: ${id}`);
    const result = await d
      .collection("treatments")
      .findOneAndUpdate({ _id: oid }, { $set: treatment }, { returnDocument: "after" });
    if (!result) throw new Error(`Treatment ${id} not found`);
    return toId(result as Record<string, unknown> & { _id?: unknown }) as Treatment;
  },

  async deleteTreatment(id) {
    const d = await getDb();
    const oid = safeObjectId(id);
    if (oid) await d.collection("treatments").deleteOne({ _id: oid });
  },

  // ── Device Status ──────────────────────────────────────────────────────────

  async getDeviceStatuses({ count = 1, dateFrom } = {}) {
    const d = await getDb();
    const filter: Record<string, unknown> = {};
    if (dateFrom != null) {
      filter.created_at = { $gte: new Date(dateFrom).toISOString() };
    }
    const docs = await d
      .collection("devicestatus")
      .find(filter as Filter<Document>)
      .sort({ created_at: -1 })
      .limit(count)
      .toArray();
    return docs.map((doc) => toId(doc as Record<string, unknown> & { _id?: unknown })) as DeviceStatus[];
  },

  async getDeviceStatusById(id) {
    const d = await getDb();
    const oid = safeObjectId(id);
    if (!oid) return null;
    const doc = await d.collection("devicestatus").findOne({ _id: oid });
    if (!doc) return null;
    return toId(doc as Record<string, unknown> & { _id?: unknown }) as DeviceStatus;
  },

  async createDeviceStatus(status) {
    const d = await getDb();
    const { _id, ...doc } = status as typeof status & { _id?: unknown };
    void _id;
    const result = await d.collection("devicestatus").insertOne(doc);
    return { ...doc, _id: result.insertedId.toHexString() };
  },

  async deleteDeviceStatus(id) {
    const d = await getDb();
    const oid = safeObjectId(id);
    if (oid) await d.collection("devicestatus").deleteOne({ _id: oid });
  },

  // ── Profiles ───────────────────────────────────────────────────────────────

  async getProfiles({ count = 100, dateFrom } = {}) {
    const d = await getDb();
    const filter: Record<string, unknown> = {};
    if (dateFrom != null) {
      filter.created_at = { $gte: new Date(dateFrom).toISOString() };
    }
    const docs = await d.collection("profile").find(filter as Filter<Document>).sort({ created_at: -1 }).limit(count).toArray();
    return docs.map((doc) => toId(doc as Record<string, unknown> & { _id?: unknown })) as Profile[];
  },

  async getActiveProfile() {
    const d = await getDb();
    const doc = await d.collection("profile").findOne({}, { sort: { created_at: -1 } });
    if (!doc) return null;
    return toId(doc as Record<string, unknown> & { _id?: unknown }) as Profile;
  },

  async getProfileById(id) {
    const d = await getDb();
    const oid = safeObjectId(id);
    if (!oid) return null;
    const doc = await d.collection("profile").findOne({ _id: oid });
    if (!doc) return null;
    return toId(doc as Record<string, unknown> & { _id?: unknown }) as Profile;
  },

  async createProfile(profile) {
    const d = await getDb();
    const result = await d.collection("profile").insertOne(profile);
    return { ...profile, _id: result.insertedId.toHexString() };
  },

  async updateProfile(id, profile) {
    const d = await getDb();
    const oid = safeObjectId(id);
    if (!oid) throw new Error(`Invalid id: ${id}`);
    const result = await d
      .collection("profile")
      .findOneAndUpdate({ _id: oid }, { $set: profile }, { returnDocument: "after" });
    if (!result) throw new Error(`Profile ${id} not found`);
    return toId(result as Record<string, unknown> & { _id?: unknown }) as Profile;
  },

  // ── Activity ───────────────────────────────────────────────────────────────

  async getActivities({ count = 10, dateFrom } = {}) {
    const d = await getDb();
    const filter: Record<string, unknown> = {};
    if (dateFrom != null) {
      filter.created_at = { $gte: new Date(dateFrom).toISOString() };
    }
    const docs = await d.collection("activity").find(filter as Filter<Document>)
      .sort({ created_at: -1 }).limit(count).toArray();
    return docs.map((doc) => toId(doc as Record<string, unknown> & { _id?: unknown })) as Activity[];
  },

  async getActivityById(id) {
    const d = await getDb();
    const oid = safeObjectId(id);
    if (!oid) return null;
    const doc = await d.collection("activity").findOne({ _id: oid });
    if (!doc) return null;
    return toId(doc as Record<string, unknown> & { _id?: unknown }) as Activity;
  },

  async createActivity(activity) {
    const d = await getDb();
    const result = await d.collection("activity").insertOne(activity);
    return { ...activity, _id: result.insertedId.toHexString() };
  },

  async deleteActivity(id) {
    const d = await getDb();
    const oid = safeObjectId(id);
    if (oid) await d.collection("activity").deleteOne({ _id: oid });
  },

  // ── UI Settings ────────────────────────────────────────────────────────────

  async getUISettings() {
    const d = await getDb();
    const doc = await d.collection("ui_settings").findOne({ _id: "default" as unknown as ObjectId });
    if (!doc) return null;
    const { _id, ...rest } = doc;
    void _id;
    return rest as NightscoutSettings;
  },

  async saveUISettings(settings) {
    const d = await getDb();
    await d.collection("ui_settings").updateOne(
      { _id: "default" as unknown as ObjectId },
      { $set: settings },
      { upsert: true },
    );
  },

  // ── Meta ───────────────────────────────────────────────────────────────────

  async getLastModified() {
    const d = await getDb();
    const [entry, treatment, status, profile] = await Promise.all([
      d.collection("entries").findOne({}, { sort: { date: -1 }, projection: { date: 1 } }),
      d.collection("treatments").findOne({}, { sort: { created_at: -1 }, projection: { created_at: 1 } }),
      d.collection("devicestatus").findOne({}, { sort: { created_at: -1 }, projection: { created_at: 1 } }),
      d.collection("profile").findOne({}, { sort: { created_at: -1 }, projection: { created_at: 1 } }),
    ]);
    return {
      srvDate: Date.now(),
      collections: {
        entries:      entry     ? Number(entry.date)                                    : null,
        treatments:   treatment ? new Date(treatment.created_at as string).getTime()   : null,
        devicestatus: status    ? new Date(status.created_at as string).getTime()      : null,
        profile:      profile   ? new Date(profile.created_at as string).getTime()     : null,
      },
    };
  },
};
