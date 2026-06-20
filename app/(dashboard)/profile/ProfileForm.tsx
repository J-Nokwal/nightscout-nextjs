"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Check } from "lucide-react";
import type { Profile, ProfileStore, BasalScheduleEntry } from "@/types/nightscout";

const TIMEZONES = Intl.supportedValuesOf("timeZone");

interface Props { initial: Profile | null }

const DEFAULT_STORE: ProfileStore = {
  dia: 6,
  units: "mg/dl",
  timezone: "UTC",
  carbs_hr: 20,
  delay: 20,
  basal:      [{ time: "00:00", timeAsSeconds: 0, value: 0.8 }],
  carbratio:  [{ time: "00:00", timeAsSeconds: 0, value: 10 }],
  sens:       [{ time: "00:00", timeAsSeconds: 0, value: 50 }],
  target_low: [{ time: "00:00", timeAsSeconds: 0, value: 80 }],
  target_high:[{ time: "00:00", timeAsSeconds: 0, value: 140 }],
};

function ScheduleEditor({
  label, entries, onChange, unit,
}: {
  label: string;
  entries: BasalScheduleEntry[];
  onChange: (v: BasalScheduleEntry[]) => void;
  unit: string;
}) {
  function update(i: number, field: keyof BasalScheduleEntry, raw: string) {
    const next = entries.map((e, idx) => {
      if (idx !== i) return e;
      if (field === "time") {
        const [h, m] = raw.split(":").map(Number);
        return { ...e, time: raw, timeAsSeconds: (h * 60 + (m || 0)) * 60 };
      }
      return { ...e, [field]: parseFloat(raw) || 0 };
    });
    onChange(next);
  }

  function add() {
    onChange([...entries, { time: "00:00", timeAsSeconds: 0, value: 0 }]);
  }

  function remove(i: number) {
    onChange(entries.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label} <span className="text-muted-foreground font-normal">({unit})</span></Label>
        <Button type="button" variant="outline" size="sm" onClick={add}>+ Add</Button>
      </div>
      {entries.map((e, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input type="time" value={e.time} onChange={(ev) => update(i, "time", ev.target.value)} className="w-28" />
          <Input type="number" step="0.01" value={e.value} onChange={(ev) => update(i, "value", ev.target.value)} className="w-24" />
          {entries.length > 1 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)} className="text-destructive px-2">✕</Button>
          )}
        </div>
      ))}
    </div>
  );
}

export function ProfileForm({ initial }: Props) {
  const initStore    = initial?.store ?? {};
  const initDefault  = initial?.defaultProfile ?? "Default";

  // Ensure there's at least one profile in state
  const [store,   setStore]   = useState<Record<string, ProfileStore>>(
    Object.keys(initStore).length ? initStore : { Default: DEFAULT_STORE }
  );
  const [active,  setActive]  = useState(
    initDefault in initStore ? initDefault : Object.keys(initStore)[0] ?? "Default"
  );
  const [defaultP, setDefaultP] = useState(initDefault);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [newName, setNewName] = useState("");
  const [addingProfile, setAddingProfile] = useState(false);

  const profileNames = Object.keys(store);
  const currentStore = store[active] ?? DEFAULT_STORE;

  function patchCurrent(fields: Partial<ProfileStore>) {
    setStore((s) => ({ ...s, [active]: { ...s[active], ...fields } }));
  }

  function addProfile() {
    const name = newName.trim();
    if (!name || store[name]) return;
    setStore((s) => ({ ...s, [name]: { ...DEFAULT_STORE } }));
    setActive(name);
    setNewName("");
    setAddingProfile(false);
  }

  function deleteProfile(name: string) {
    if (profileNames.length <= 1) return;
    if (!confirm(`Delete profile "${name}"?`)) return;
    const updated = { ...store };
    delete updated[name];
    setStore(updated);
    const remaining = Object.keys(updated);
    if (active === name) setActive(remaining[0]);
    if (defaultP === name) setDefaultP(remaining[0]);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    const profile: Partial<Profile> = {
      defaultProfile: defaultP,
      store,
      startDate: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    try {
      const profileId = initial?._id;
      const res = profileId
        ? await fetch(`/api/v3/profiles/${profileId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(profile),
          })
        : await fetch("/api/v3/profiles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(profile),
          });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile switcher */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            Profiles
            <Button type="button" variant="outline" size="sm" onClick={() => setAddingProfile((v) => !v)} className="gap-1">
              <Plus size={13} /> New Profile
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {profileNames.map((name) => (
              <div key={name} className="flex items-center gap-1">
                <button
                  onClick={() => setActive(name)}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                    active === name
                      ? "bg-primary text-primary-foreground border-primary font-medium"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {name}
                  {name === defaultP && (
                    <Badge className="ml-1.5 text-xs bg-green-600 text-white py-0 px-1">active</Badge>
                  )}
                </button>
                {profileNames.length > 1 && (
                  <button
                    onClick={() => deleteProfile(name)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    title={`Delete "${name}"`}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {addingProfile && (
            <div className="flex items-center gap-2 pt-1">
              <Input
                placeholder="Profile name (e.g. Weekday)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addProfile()}
                className="w-56 h-8 text-sm"
                autoFocus
              />
              <Button type="button" size="sm" onClick={addProfile} disabled={!newName.trim()}>Add</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setAddingProfile(false)}>Cancel</Button>
            </div>
          )}

          {/* Active profile selector */}
          <div className="flex items-center gap-3 pt-2 border-t">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">Active profile:</Label>
            <Select value={defaultP} onValueChange={(v) => v && setDefaultP(v)}>
              <SelectTrigger className="w-48 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {profileNames.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {defaultP !== (initial?.defaultProfile ?? "Default") && (
              <span className="text-xs text-amber-600 dark:text-amber-400">unsaved</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            The active profile is used for ISF, carb ratio, and BG targets on the dashboard.
          </p>
        </CardContent>
      </Card>

      {/* Editing indicator */}
      <div className="flex items-center gap-2">
        <Check size={14} className="text-primary" />
        <span className="text-sm font-medium">Editing: <span className="text-primary">{active}</span></span>
        {active !== defaultP && (
          <Badge variant="outline" className="text-xs">not active</Badge>
        )}
      </div>

      {/* Basic settings */}
      <Card>
        <CardHeader><CardTitle className="text-base">Basic Settings — {active}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Insulin Duration (DIA, hours)</Label>
              <Input type="number" step="0.5" min="2" max="12"
                value={currentStore.dia}
                onChange={(e) => patchCurrent({ dia: parseFloat(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Glucose Units</Label>
              <Select value={currentStore.units} onValueChange={(v) => v && patchCurrent({ units: v as "mg/dl" | "mmol" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mg/dl">mg/dL</SelectItem>
                  <SelectItem value="mmol">mmol/L</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Carb Absorption Rate (g/hr)</Label>
              <Input type="number" step="1" value={currentStore.carbs_hr ?? 20}
                onChange={(e) => patchCurrent({ carbs_hr: parseFloat(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Select value={currentStore.timezone} onValueChange={(v) => v && patchCurrent({ timezone: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedules */}
      <Card>
        <CardHeader><CardTitle className="text-base">Daily Schedules — {active}</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <ScheduleEditor label="Basal Rate" unit="U/hr" entries={currentStore.basal}
            onChange={(v) => patchCurrent({ basal: v })} />
          <ScheduleEditor label="Carb Ratio" unit="g/U" entries={currentStore.carbratio}
            onChange={(v) => patchCurrent({ carbratio: v })} />
          <ScheduleEditor label="Insulin Sensitivity (ISF)" unit="mg/dL per U" entries={currentStore.sens}
            onChange={(v) => patchCurrent({ sens: v })} />
          <ScheduleEditor label="BG Target Low" unit="mg/dL" entries={currentStore.target_low}
            onChange={(v) => patchCurrent({ target_low: v })} />
          <ScheduleEditor label="BG Target High" unit="mg/dL" entries={currentStore.target_high}
            onChange={(v) => patchCurrent({ target_high: v })} />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save All Profiles"}
        </Button>
        {saved && <Badge className="bg-green-600 text-white">Saved ✓</Badge>}
      </div>
    </div>
  );
}
