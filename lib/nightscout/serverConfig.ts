// Server-side only — reads all supported Nightscout environment variables.

function envBool(key: string, def: boolean): boolean {
  const v = process.env[key];
  if (!v) return def;
  return v.toLowerCase() === "on" || v.toLowerCase() === "true";
}

function envNum(key: string, def: number): number {
  const v = process.env[key];
  if (!v) return def;
  const n = parseFloat(v);
  return isNaN(n) ? def : n;
}

function envStr(key: string): string | null {
  return process.env[key] ?? null;
}

export interface ServerConfig {
  displayUnits: "mg/dl" | "mmol";
  customTitle: string;
  baseUrl: string;
  timeFormat: "12" | "24";
  nightMode: boolean;
  language: string;

  bgHigh: number;
  bgTargetTop: number;
  bgTargetBottom: number;
  bgLow: number;

  alarmTypes: "simple" | "predict";
  alarmUrgentHigh: boolean;
  alarmHigh: boolean;
  alarmLow: boolean;
  alarmUrgentLow: boolean;
  alarmTimeagoWarn: boolean;
  alarmTimeagoWarnMins: number;
  alarmTimeagoUrgent: boolean;
  alarmTimeagoUrgentMins: number;

  enabledPlugins: string[];
  disabledPlugins: string[];

  authDefaultRoles: "readable" | "denied" | "status-only";

  cageEnableAlerts: boolean; cageInfo: number; cageWarn: number; cageUrgent: number;
  sageEnableAlerts: boolean; sageInfo: number; sageWarn: number; sageUrgent: number;
  iageEnableAlerts: boolean; iageInfo: number; iageWarn: number; iageUrgent: number;
  bageEnableAlerts: boolean; bageInfo: number; bageWarn: number; bageUrgent: number;

  upbatEnableAlerts: boolean;
  upbatWarn: number;
  upbatUrgent: number;

  pumpEnableAlerts: boolean;
  pumpWarnOnSuspend: boolean;
  pumpWarnRes: number;
  pumpUrgentRes: number;
  pumpWarnBattP: number;
  pumpUrgentBattP: number;
  pumpWarnBattV: number;
  pumpUrgentBattV: number;

  openapsEnableAlerts: boolean;
  openapsWarn: number;
  openapsUrgent: number;
  loopEnableAlerts: boolean;
  loopWarn: number;
  loopUrgent: number;

  treatmentnotifySnooze: number;

  connectSource: string | null;
  connectLinkUpUsername: string | null;
  connectLinkUpPassword: string | null;
  connectLinkUpRegion: string;
  connectLinkUpPatientId: string | null;
  connectShareAccountName: string | null;
  connectSharePassword: string | null;
  connectShareRegion: string;

  pushoverAlarmKey: string | null;
  pushoverAnnouncementKey: string | null;

  makerKey: string | null;
  makerAnnouncementKey: string | null;
}

export function getServerConfig(): ServerConfig {
  const units = (envStr("DISPLAY_UNITS") ?? envStr("NIGHTSCOUT_UNITS") ?? "mg/dl").toLowerCase();

  return {
    displayUnits:    units === "mmol" || units === "mmol/l" ? "mmol" : "mg/dl",
    customTitle:     envStr("CUSTOM_TITLE") ?? "Nightscout",
    baseUrl:         envStr("BASE_URL") ?? "",
    timeFormat:      (envStr("TIME_FORMAT") ?? "24") === "12" ? "12" : "24",
    nightMode:       envBool("NIGHT_MODE", false),
    language:        envStr("LANGUAGE") ?? "en",

    bgHigh:          envNum("BG_HIGH",          260),
    bgTargetTop:     envNum("BG_TARGET_TOP",    180),
    bgTargetBottom:  envNum("BG_TARGET_BOTTOM",  70),
    bgLow:           envNum("BG_LOW",            55),

    alarmTypes:             (envStr("ALARM_TYPES") ?? "simple") as "simple" | "predict",
    alarmUrgentHigh:        envBool("ALARM_URGENT_HIGH",        true),
    alarmHigh:              envBool("ALARM_HIGH",               true),
    alarmLow:               envBool("ALARM_LOW",                true),
    alarmUrgentLow:         envBool("ALARM_URGENT_LOW",         true),
    alarmTimeagoWarn:       envBool("ALARM_TIMEAGO_WARN",       true),
    alarmTimeagoWarnMins:   envNum("ALARM_TIMEAGO_WARN_MINS",   15),
    alarmTimeagoUrgent:     envBool("ALARM_TIMEAGO_URGENT",     true),
    alarmTimeagoUrgentMins: envNum("ALARM_TIMEAGO_URGENT_MINS", 30),

    enabledPlugins:  (envStr("ENABLE")  ?? "").split(/\s+/).filter(Boolean),
    disabledPlugins: (envStr("DISABLE") ?? "").split(/\s+/).filter(Boolean),

    authDefaultRoles: (envStr("AUTH_DEFAULT_ROLES") ?? "readable") as ServerConfig["authDefaultRoles"],

    cageEnableAlerts: envBool("CAGE_ENABLE_ALERTS", false),
    cageInfo:         envNum("CAGE_INFO",    44),
    cageWarn:         envNum("CAGE_WARN",    48),
    cageUrgent:       envNum("CAGE_URGENT",  72),

    sageEnableAlerts: envBool("SAGE_ENABLE_ALERTS", false),
    sageInfo:         envNum("SAGE_INFO",   144),
    sageWarn:         envNum("SAGE_WARN",   164),
    sageUrgent:       envNum("SAGE_URGENT", 166),

    iageEnableAlerts: envBool("IAGE_ENABLE_ALERTS", false),
    iageInfo:         envNum("IAGE_INFO",    44),
    iageWarn:         envNum("IAGE_WARN",    48),
    iageUrgent:       envNum("IAGE_URGENT",  72),

    bageEnableAlerts: envBool("BAGE_ENABLE_ALERTS", false),
    bageInfo:         envNum("BAGE_INFO",   312),
    bageWarn:         envNum("BAGE_WARN",   336),
    bageUrgent:       envNum("BAGE_URGENT", 360),

    upbatEnableAlerts: envBool("UPBAT_ENABLE_ALERTS", false),
    upbatWarn:         envNum("UPBAT_WARN",    30),
    upbatUrgent:       envNum("UPBAT_URGENT",  20),

    pumpEnableAlerts:  envBool("PUMP_ENABLE_ALERTS",   false),
    pumpWarnOnSuspend: envBool("PUMP_WARN_ON_SUSPEND", false),
    pumpWarnRes:       envNum("PUMP_WARN_RES",          10),
    pumpUrgentRes:     envNum("PUMP_URGENT_RES",         5),
    pumpWarnBattP:     envNum("PUMP_WARN_BATT_P",       30),
    pumpUrgentBattP:   envNum("PUMP_URGENT_BATT_P",     20),
    pumpWarnBattV:     envNum("PUMP_WARN_BATT_V",     1.35),
    pumpUrgentBattV:   envNum("PUMP_URGENT_BATT_V",   1.30),

    openapsEnableAlerts: envBool("OPENAPS_ENABLE_ALERTS", false),
    openapsWarn:         envNum("OPENAPS_WARN",  30),
    openapsUrgent:       envNum("OPENAPS_URGENT", 60),

    loopEnableAlerts: envBool("LOOP_ENABLE_ALERTS", false),
    loopWarn:         envNum("LOOP_WARN",  30),
    loopUrgent:       envNum("LOOP_URGENT", 60),

    treatmentnotifySnooze: envNum("TREATMENTNOTIFY_SNOOZE_MINS", 10),

    connectSource:           envStr("CONNECT_SOURCE"),
    connectLinkUpUsername:   envStr("CONNECT_LINK_UP_USERNAME"),
    connectLinkUpPassword:   envStr("CONNECT_LINK_UP_PASSWORD"),
    connectLinkUpRegion:     envStr("CONNECT_LINK_UP_REGION") ?? "EU",
    connectLinkUpPatientId:  envStr("CONNECT_LINK_UP_PATIENT_ID"),
    connectShareAccountName: envStr("CONNECT_SHARE_ACCOUNT_NAME"),
    connectSharePassword:    envStr("CONNECT_SHARE_PASSWORD"),
    connectShareRegion:      envStr("CONNECT_SHARE_REGION") ?? "us",

    pushoverAlarmKey:        envStr("PUSHOVER_ALARM_KEY"),
    pushoverAnnouncementKey: envStr("PUSHOVER_ANNOUNCEMENT_KEY"),

    makerKey:             envStr("MAKER_KEY"),
    makerAnnouncementKey: envStr("MAKER_ANNOUNCEMENT_KEY"),
  };
}
