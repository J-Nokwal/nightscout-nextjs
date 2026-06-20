"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TreatmentEventType } from "@/types/nightscout";
import type { FoodItem } from "@/lib/nightscout/foodDb";
import { sendAnnouncementNotification } from "@/app/actions/notify";
import { loadSettings } from "@/lib/nightscout/settings";

const EVENT_TYPES: TreatmentEventType[] = [
  "Meal Bolus", "Correction Bolus", "Snack Bolus",
  "Carb Correction", "BG Check",
  "Temp Basal", "Temporary Target", "Temporary Target Cancel",
  "Site Change", "Sensor Change", "Sensor Start", "Sensor Stop",
  "Insulin Change", "Pump Battery Change",
  "Pump Suspend", "Pump Resume",
  "Exercise", "Note", "Announcement", "Profile Switch",
];

const SHOWS_INSULIN: TreatmentEventType[]  = ["Meal Bolus","Correction Bolus","Snack Bolus","Carb Correction"];
const SHOWS_CARBS: TreatmentEventType[]    = ["Meal Bolus","Snack Bolus","Carb Correction"];
const SHOWS_BG: TreatmentEventType[]       = ["Meal Bolus","Correction Bolus","Snack Bolus","BG Check","Carb Correction"];
const SHOWS_DURATION: TreatmentEventType[] = ["Temp Basal","Temporary Target","Exercise"];
const SHOWS_RATE: TreatmentEventType[]     = ["Temp Basal"];

function FoodSearch({ onSelect }: { onSelect: (item: FoodItem) => void }) {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<FoodItem[]>([]);
  const [open, setOpen]         = useState(false);
  const debounceRef             = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef            = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function onInput(q: string) {
    setQuery(q);
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/v3/food?q=${encodeURIComponent(q)}&limit=8`);
      const data: FoodItem[] = await res.json();
      setResults(data);
      setOpen(data.length > 0);
    }, 150);
  }

  function pick(item: FoodItem) {
    onSelect(item);
    setQuery(item.name);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        placeholder="Search food (e.g. apple, rice…)"
        value={query}
        onChange={(e) => onInput(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg overflow-hidden">
          {results.map((item) => (
            <button
              key={item.name}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between gap-2"
              onClick={() => pick(item)}
            >
              <div>
                <span className="font-medium">{item.name}</span>
                <span className="text-xs text-muted-foreground ml-2">{item.unit}</span>
              </div>
              <span className="text-xs font-semibold text-orange-500 shrink-0">{item.carbs}g carbs</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CarePortalForm() {
  const router   = useRouter();
  const ismmol   = loadSettings().unit === "mmol";
  const bgLabel  = ismmol ? "Blood Glucose (mmol/L)" : "Blood Glucose (mg/dL)";
  const bgStep   = ismmol ? "0.1" : "1";
  const bgPlaceholder = ismmol ? "e.g. 7.2" : "e.g. 120";

  const [eventType, setEventType] = useState<TreatmentEventType>("Meal Bolus");
  const [insulin,   setInsulin]   = useState("");
  const [carbs,     setCarbs]     = useState("");
  const [glucose,   setGlucose]   = useState("");
  const [duration,  setDuration]  = useState("");
  const [rate,      setRate]      = useState("");
  const [notes,     setNotes]     = useState("");
  const [enteredBy, setEnteredBy] = useState("nightscout-nextjs");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [useNow,    setUseNow]    = useState(true);
  const [retroDate, setRetroDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM" for datetime-local
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const ts = useNow ? Date.now() : new Date(retroDate).getTime();
    const body: Record<string, unknown> = {
      eventType,
      created_at: new Date(ts).toISOString(),
      timestamp:  ts,
      enteredBy,
      notes: notes || undefined,
    };

    if (SHOWS_INSULIN.includes(eventType)  && insulin)  body.insulin  = parseFloat(insulin);
    if (SHOWS_CARBS.includes(eventType)    && carbs)    body.carbs    = parseFloat(carbs);
    if (SHOWS_BG.includes(eventType) && glucose) {
      const raw = parseFloat(glucose);
      // Always store in mg/dL internally; convert if user entered in mmol
      body.glucose = ismmol ? Math.round(raw * 18.01559) : raw;
    }
    if (SHOWS_DURATION.includes(eventType) && duration) body.duration = parseFloat(duration);
    if (SHOWS_RATE.includes(eventType)     && rate)     body.absolute = parseFloat(rate);

    try {
      const res = await fetch("/api/v3/treatments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      // Fire-and-forget push notification for announcements
      if (eventType === "Announcement" && notes) {
        sendAnnouncementNotification(notes).catch(() => undefined);
      }
      router.push("/treatments");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const showCarbs = SHOWS_CARBS.includes(eventType);

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={submit} className="space-y-5">
          {/* Event type */}
          <div className="space-y-1.5">
            <Label>Event Type</Label>
            <Select value={eventType} onValueChange={(v) => v && setEventType(v as TreatmentEventType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Conditional fields */}
          {SHOWS_INSULIN.includes(eventType) && (
            <div className="space-y-1.5">
              <Label>Insulin (U)</Label>
              <Input type="number" step="0.05" min="0" placeholder="0.00"
                value={insulin} onChange={(e) => setInsulin(e.target.value)} />
            </div>
          )}

          {showCarbs && (
            <div className="space-y-2">
              <Label>Carbohydrates (g)</Label>
              {/* Food search autocomplete */}
              <FoodSearch onSelect={(item) => setCarbs(String(item.carbs))} />
              <Input type="number" step="1" min="0" placeholder="or enter grams directly"
                value={carbs} onChange={(e) => setCarbs(e.target.value)} />
            </div>
          )}

          {SHOWS_BG.includes(eventType) && (
            <div className="space-y-1.5">
              <Label>{bgLabel}</Label>
              <Input type="number" step={bgStep} min="0" placeholder={bgPlaceholder}
                value={glucose} onChange={(e) => setGlucose(e.target.value)} />
            </div>
          )}

          {SHOWS_RATE.includes(eventType) && (
            <div className="space-y-1.5">
              <Label>Temp Basal Rate (U/hr)</Label>
              <Input type="number" step="0.025" min="0" placeholder="0.000"
                value={rate} onChange={(e) => setRate(e.target.value)} />
            </div>
          )}

          {SHOWS_DURATION.includes(eventType) && (
            <div className="space-y-1.5">
              <Label>Duration (minutes)</Label>
              <Input type="number" step="5" min="0" placeholder="30"
                value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Entered By</Label>
            <Input value={enteredBy} onChange={(e) => setEnteredBy(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} placeholder="Optional notes…"
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {/* Timestamp — current or retrospective */}
          <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Log for current time</Label>
              <Switch checked={useNow} onCheckedChange={setUseNow} />
            </div>
            {!useNow && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Date &amp; time</Label>
                <Input
                  type="datetime-local"
                  value={retroDate}
                  onChange={(e) => setRetroDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 16)}
                />
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Log Treatment"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
