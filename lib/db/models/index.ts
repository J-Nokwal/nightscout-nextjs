import type { Entry, Treatment, DeviceStatus, Profile, Activity } from "@/types/nightscout";
import type { NightscoutSettings } from "@/lib/nightscout/settings";

export interface LastModifiedResult {
  srvDate: number;
  collections: {
    entries: number | null;
    treatments: number | null;
    devicestatus: number | null;
    profile: number | null;
  };
}

export interface NightscoutDB {
  // Entries
  getEntries(opts?: { count?: number; dateFrom?: number; dateTo?: number; find?: Partial<Entry> }): Promise<Entry[]>;
  getEntryById(id: string): Promise<Entry | null>;
  createEntry(entry: Omit<Entry, "_id">): Promise<Entry>;
  createEntries(entries: Omit<Entry, "_id">[]): Promise<Entry[]>;
  updateEntry(id: string, update: Partial<Omit<Entry, "_id">>): Promise<Entry | null>;
  deleteEntry(id: string): Promise<void>;

  // Treatments
  getTreatments(opts?: { count?: number; skip?: number; dateFrom?: number; find?: Partial<Treatment> }): Promise<Treatment[]>;
  getTreatmentById(id: string): Promise<Treatment | null>;
  createTreatment(treatment: Omit<Treatment, "_id">): Promise<Treatment>;
  updateTreatment(id: string, treatment: Partial<Treatment>): Promise<Treatment>;
  deleteTreatment(id: string): Promise<void>;

  // Device Status
  getDeviceStatuses(opts?: { count?: number; dateFrom?: number }): Promise<DeviceStatus[]>;
  getDeviceStatusById(id: string): Promise<DeviceStatus | null>;
  createDeviceStatus(status: Omit<DeviceStatus, "_id">): Promise<DeviceStatus>;
  deleteDeviceStatus(id: string): Promise<void>;

  // Profiles
  getProfiles(opts?: { dateFrom?: number; count?: number }): Promise<Profile[]>;
  getActiveProfile(): Promise<Profile | null>;
  getProfileById(id: string): Promise<Profile | null>;
  createProfile(profile: Omit<Profile, "_id">): Promise<Profile>;
  updateProfile(id: string, profile: Partial<Profile>): Promise<Profile>;

  // Activity
  getActivities(opts?: { count?: number; dateFrom?: number }): Promise<Activity[]>;
  getActivityById(id: string): Promise<Activity | null>;
  createActivity(activity: Omit<Activity, "_id">): Promise<Activity>;
  deleteActivity(id: string): Promise<void>;

  // Settings (UI preferences stored server-side)
  getUISettings(): Promise<NightscoutSettings | null>;
  saveUISettings(settings: NightscoutSettings): Promise<void>;

  // Meta
  getLastModified(): Promise<LastModifiedResult>;
}
