export interface AlarmSnoozeMins {
  urgentLow:  number;
  low:        number;
  high:       number;
  urgentHigh: number;
  stale:      number;
}

export interface PluginVisibility {
  iob:       boolean;
  cob:       boolean;
  noise:     boolean;
  upbat:     boolean;
  sage:      boolean;
  cage:      boolean;
  iage:      boolean;
  bage:      boolean;
  pump:      boolean;
  loop:      boolean;
}

export interface NightscoutSettings {
  unit: "mg/dl" | "mmol";
  timeFormat: "12" | "24";
  nightMode: boolean;
  urgentLow: number;
  low: number;
  high: number;
  urgentHigh: number;
  dia: number;
  carbsPerHour: number;
  // New fields
  customTitle: string;
  snoozeMins: AlarmSnoozeMins;
  plugins: PluginVisibility;
  bolusDisplayThreshold: number;
  speakAlarms: boolean;
}

export const DEFAULT_SETTINGS: NightscoutSettings = {
  unit: "mg/dl",
  timeFormat: "24",
  nightMode: false,
  urgentLow: 55,
  low: 70,
  high: 180,
  urgentHigh: 260,
  dia: 6,
  carbsPerHour: 20,
  customTitle: "",
  snoozeMins: {
    urgentLow:  30,
    low:        15,
    high:       30,
    urgentHigh: 30,
    stale:      15,
  },
  plugins: {
    iob:   true,
    cob:   true,
    noise: true,
    upbat: true,
    sage:  true,
    cage:  true,
    iage:  true,
    bage:  true,
    pump:  true,
    loop:  true,
  },
  bolusDisplayThreshold: 0,
  speakAlarms: false,
};

const KEY = "ns_settings";

export function loadSettings(): NightscoutSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: NightscoutSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}
