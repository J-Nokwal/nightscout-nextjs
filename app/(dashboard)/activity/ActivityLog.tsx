"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, X } from "lucide-react";
import type { Activity } from "@/types/nightscout";

const ACTIVITY_TYPES = [
  "Run", "Walk", "Bike", "Swim", "Gym", "Yoga",
  "Hike", "HIIT", "Sports", "Other",
];

function formatDuration(mins: number) {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

interface Props {
  initialActivities: Activity[];
}

export function ActivityLog({ initialActivities }: Props) {
  const [activities, setActivities] = useState(initialActivities);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [actType, setActType] = useState("Run");
  const [duration, setDuration] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [steps, setSteps] = useState("");
  const [distance, setDistance] = useState("");
  const [notes, setNotes] = useState("");
  const [enteredAt, setEnteredAt] = useState(() => new Date().toISOString().slice(0, 16));

  function resetForm() {
    setActType("Run"); setDuration(""); setHeartRate("");
    setSteps(""); setDistance(""); setNotes("");
    setEnteredAt(new Date().toISOString().slice(0, 16));
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!duration) { setError("Duration is required"); return; }
    setSaving(true); setError("");
    try {
      const body: Omit<Activity, "_id"> = {
        created_at: new Date(enteredAt).toISOString(),
        activityType: actType,
        duration: parseInt(duration),
        notes: notes || undefined,
        enteredBy: "web",
        heartRate: heartRate ? parseInt(heartRate) : undefined,
        steps:     steps     ? parseInt(steps)     : undefined,
        distance:  distance  ? parseFloat(distance) : undefined,
      };
      const res = await fetch("/api/v3/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json() as Activity;
      setActivities((a) => [created, ...a]);
      resetForm();
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function deleteActivity(id: string) {
    if (!confirm("Delete this activity?")) return;
    await fetch(`/api/v3/activity/${id}`, { method: "DELETE" });
    setActivities((a) => a.filter((x) => x._id !== id));
  }

  return (
    <div className="space-y-4">
      {/* Log button */}
      {!showForm ? (
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus size={16} /> Log Activity
        </Button>
      ) : (
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">New Activity</h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Activity Type</Label>
                  <Select value={actType} onValueChange={(v) => v && setActType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Duration (minutes)</Label>
                  <Input type="number" min="1" max="600" value={duration}
                    onChange={(e) => setDuration(e.target.value)} placeholder="30" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Heart Rate (bpm)</Label>
                  <Input type="number" min="40" max="220" value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)} placeholder="optional" />
                </div>
                <div className="space-y-1.5">
                  <Label>Steps</Label>
                  <Input type="number" min="0" value={steps}
                    onChange={(e) => setSteps(e.target.value)} placeholder="optional" />
                </div>
                <div className="space-y-1.5">
                  <Label>Distance (km)</Label>
                  <Input type="number" step="0.1" min="0" value={distance}
                    onChange={(e) => setDistance(e.target.value)} placeholder="optional" />
                </div>
                <div className="space-y-1.5">
                  <Label>Date &amp; Time</Label>
                  <Input type="datetime-local" value={enteredAt}
                    onChange={(e) => setEnteredAt(e.target.value)}
                    max={new Date().toISOString().slice(0, 16)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optional" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-3">
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Activity list */}
      {activities.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No activities logged yet.
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((a) => (
            <Card key={a._id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="secondary">{a.activityType ?? "Activity"}</Badge>
                    {a.duration != null && (
                      <span className="text-sm font-medium">{formatDuration(a.duration)}</span>
                    )}
                    {a.heartRate != null && (
                      <span className="text-xs text-muted-foreground">♥ {a.heartRate} bpm</span>
                    )}
                    {a.steps != null && (
                      <span className="text-xs text-muted-foreground">{a.steps.toLocaleString()} steps</span>
                    )}
                    {a.distance != null && (
                      <span className="text-xs text-muted-foreground">{a.distance.toFixed(1)} km</span>
                    )}
                    {a.notes && (
                      <span className="text-xs text-muted-foreground italic">{a.notes}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
                    {a._id && (
                      <button onClick={() => deleteActivity(a._id!)}
                        className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
