export type GlucoseDirection =
  | "DoubleUp"
  | "SingleUp"
  | "FortyFiveUp"
  | "Flat"
  | "FortyFiveDown"
  | "SingleDown"
  | "DoubleDown"
  | "NONE";

export type EntryType = "sgv" | "mbg" | "cal";

export interface Entry {
  _id?: string;
  date: number; // ms epoch
  dateString?: string;
  type: EntryType;
  sgv?: number; // mg/dL
  mbg?: number; // mg/dL
  direction?: GlucoseDirection;
  noise?: number;
  filtered?: number;
  unfiltered?: number;
  rssi?: number;
  device?: string;
  utcOffset?: number;
  sysTime?: string;
}

export type TreatmentEventType =
  | "Meal Bolus"
  | "Correction Bolus"
  | "Snack Bolus"
  | "Bolus Wizard"
  | "Carb Correction"
  | "Temp Basal"
  | "Temporary Target"
  | "Temporary Target Cancel"
  | "Site Change"
  | "Sensor Change"
  | "Sensor Start"
  | "Sensor Stop"
  | "Insulin Change"
  | "Pump Battery Change"
  | "Pump Suspend"
  | "Pump Resume"
  | "Note"
  | "Exercise"
  | "BG Check"
  | "Announcement"
  | "D.A.D. Alert"
  | "Question Mark"
  | "Profile Switch";

export interface Treatment {
  _id?: string;
  eventType: TreatmentEventType;
  created_at: string; // ISO 8601
  timestamp?: number; // ms epoch
  glucose?: number; // mg/dL
  glucoseType?: "Sensor" | "Finger" | "Manual";
  carbs?: number;
  protein?: number;
  fat?: number;
  insulin?: number;
  units?: "mg/dl" | "mmol";
  duration?: number; // minutes
  percent?: number;
  absolute?: number; // U/hr for temp basals
  rate?: number;
  preBolus?: number;
  splitNow?: number;
  splitExt?: number;
  enteredBy?: string;
  notes?: string;
  targetTop?: number;
  targetBottom?: number;
  device?: string;
}

export interface DeviceStatus {
  _id?: string;
  created_at: string;
  device?: string;
  pump?: {
    clock?: string;
    battery?: { status?: string; voltage?: number };
    reservoir?: number;
    status?: { status?: string; bolusing?: boolean; suspended?: boolean };
    extended?: Record<string, unknown>;
    bolusing?: boolean;
    suspended?: boolean;
    reservoir_display_override?: string;
  };
  uploader?: {
    battery?: number;
    name?: string;
    timestamp?: string;
  };
  loop?: {
    name?: string;
    version?: string;
    timestamp?: string;
    iob?: { iob?: number; timestamp?: string };
    cob?: { cob?: number; timestamp?: string };
    predicted?: { startDate?: string; values?: number[] };
    recommendedBolus?: number;
    recommendedTempBasal?: { rate?: number; duration?: number };
    enacted?: { rate?: number; duration?: number; received?: boolean; timestamp?: string };
    failureReason?: string;
    automaticDoseRecommendation?: Record<string, unknown>;
  };
  openaps?: Record<string, unknown>;
  xdripjs?: Record<string, unknown>;
}

export interface Activity {
  _id?: string;
  created_at: string;
  activityType?: string;
  duration?: number;      // minutes
  notes?: string;
  enteredBy?: string;
  steps?: number;
  heartRate?: number;
  distance?: number;      // km
}

export interface BasalScheduleEntry {
  time: string; // "HH:MM"
  timeAsSeconds: number;
  value: number; // U/hr
}

export interface ProfileStore {
  dia: number; // insulin duration, hours
  carbratio: BasalScheduleEntry[];
  carbs_hr?: number;
  delay?: number;
  sens: BasalScheduleEntry[]; // ISF mg/dL per U
  timezone: string;
  basal: BasalScheduleEntry[];
  target_low: BasalScheduleEntry[];
  target_high: BasalScheduleEntry[];
  startDate?: string;
  units: "mg/dl" | "mmol";
}

export interface Profile {
  _id?: string;
  defaultProfile: string;
  store: Record<string, ProfileStore>;
  startDate: string;
  created_at: string;
  mills?: number;
}
