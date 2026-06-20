"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Pencil } from "lucide-react";
import type { Treatment, TreatmentEventType } from "@/types/nightscout";

const PAGE_SIZE = 50;

const TYPE_COLOR: Record<string, string> = {
  "Meal Bolus":          "bg-blue-500 text-white",
  "Correction Bolus":    "bg-purple-500 text-white",
  "Snack Bolus":         "bg-blue-300 text-black",
  "Carb Correction":     "bg-orange-400 text-white",
  "BG Check":            "bg-slate-400 text-white",
  "Temp Basal":          "bg-cyan-500 text-white",
  "Site Change":         "bg-green-500 text-white",
  "Sensor Start":        "bg-green-700 text-white",
  "Sensor Change":       "bg-emerald-500 text-white",
  "Insulin Change":      "bg-teal-500 text-white",
  "Pump Battery Change": "bg-lime-500 text-black",
  "Exercise":            "bg-yellow-500 text-black",
  "Note":                "bg-gray-400 text-white",
};

const ALL_TYPES: TreatmentEventType[] = [
  "Meal Bolus", "Correction Bolus", "Snack Bolus", "Carb Correction",
  "BG Check", "Temp Basal", "Temporary Target", "Temporary Target Cancel",
  "Site Change", "Sensor Change", "Sensor Start", "Sensor Stop",
  "Insulin Change", "Pump Battery Change", "Pump Suspend", "Pump Resume",
  "Exercise", "Note", "Announcement", "Profile Switch",
];

interface EditState {
  treatment: Treatment;
  insulin: string;
  carbs: string;
  glucose: string;
  duration: string;
  notes: string;
}

export function TreatmentTable({ initialTreatments }: { initialTreatments: Treatment[] }) {
  const [treatments, setTreatments] = useState(initialTreatments);
  const [deleting,   setDeleting]   = useState<string | null>(null);
  const [filter,     setFilter]     = useState<string>("all");
  const [search,     setSearch]     = useState("");
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,    setHasMore]    = useState(initialTreatments.length === PAGE_SIZE);
  const [edit,        setEdit]       = useState<EditState | null>(null);
  const [saving,      setSaving]     = useState(false);
  const [saveError,   setSaveError]  = useState("");
  const [selected,    setSelected]   = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const filtered = treatments.filter((t) => {
    if (filter !== "all" && t.eventType !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const haystack = [t.eventType, t.notes ?? "", String(t.insulin ?? ""), String(t.carbs ?? "")].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (dateFrom) {
      const ms = new Date(dateFrom).getTime();
      const tMs = t.timestamp ?? new Date(t.created_at).getTime();
      if (tMs < ms) return false;
    }
    if (dateTo) {
      const ms = new Date(dateTo).getTime() + 86_400_000;
      const tMs = t.timestamp ?? new Date(t.created_at).getTime();
      if (tMs > ms) return false;
    }
    return true;
  });

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ count: String(PAGE_SIZE), skip: String(treatments.length) });
      if (filter !== "all") params.set("eventType", filter);
      const res = await fetch(`/api/v3/treatments?${params}`);
      const next: Treatment[] = await res.json();
      setTreatments((prev) => [...prev, ...next]);
      setHasMore(next.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }, [treatments.length, filter]);

  async function del(id: string) {
    if (!confirm("Delete this treatment?")) return;
    setDeleting(id);
    await fetch(`/api/v3/treatments/${id}`, { method: "DELETE" });
    setTreatments((prev) => prev.filter((t) => t._id !== id));
    setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
    setDeleting(null);
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selected.size} treatment${selected.size > 1 ? "s" : ""}?`)) return;
    setBulkDeleting(true);
    const ids = [...selected];
    await Promise.all(ids.map((id) => fetch(`/api/v3/treatments/${id}`, { method: "DELETE" })));
    setTreatments((prev) => prev.filter((t) => !t._id || !selected.has(t._id)));
    setSelected(new Set());
    setBulkDeleting(false);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const allIds = filtered.map((t) => t._id).filter(Boolean) as string[];
    if (allIds.every((id) => selected.has(id))) {
      setSelected((prev) => { const next = new Set(prev); allIds.forEach((id) => next.delete(id)); return next; });
    } else {
      setSelected((prev) => new Set([...prev, ...allIds]));
    }
  }

  function openEdit(t: Treatment) {
    setEdit({
      treatment: t,
      insulin:  t.insulin  != null ? String(t.insulin)  : "",
      carbs:    t.carbs    != null ? String(t.carbs)    : "",
      glucose:  t.glucose  != null ? String(t.glucose)  : "",
      duration: t.duration != null ? String(t.duration) : "",
      notes:    t.notes ?? "",
    });
    setSaveError("");
  }

  async function saveEdit() {
    if (!edit) return;
    setSaving(true);
    setSaveError("");
    const body: Record<string, unknown> = {};
    if (edit.insulin  !== "") body.insulin  = parseFloat(edit.insulin);
    if (edit.carbs    !== "") body.carbs    = parseFloat(edit.carbs);
    if (edit.glucose  !== "") body.glucose  = parseFloat(edit.glucose);
    if (edit.duration !== "") body.duration = parseFloat(edit.duration);
    body.notes = edit.notes || undefined;

    try {
      const res = await fetch(`/api/v3/treatments/${edit.treatment._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated: Treatment = await res.json();
      setTreatments((prev) => prev.map((t) => t._id === updated._id ? updated : t));
      setEdit(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const showInsulin  = edit && ["Meal Bolus","Correction Bolus","Snack Bolus","Carb Correction"].includes(edit.treatment.eventType);
  const showCarbs    = edit && ["Meal Bolus","Snack Bolus","Carb Correction"].includes(edit.treatment.eventType);
  const showGlucose  = edit && ["Meal Bolus","Correction Bolus","Snack Bolus","BG Check","Carb Correction"].includes(edit.treatment.eventType);
  const showDuration = edit && ["Temp Basal","Temporary Target","Exercise"].includes(edit.treatment.eventType);

  return (
    <div className="space-y-4">
      {/* Filters */}
      {/* Filters — stack on mobile */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
        <Select value={filter} onValueChange={(v) => v && setFilter(v)}>
          <SelectTrigger className="sm:w-44 h-8"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ALL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:w-48 h-8 text-sm"
        />
        <div className="flex items-center gap-1">
          <Label className="text-muted-foreground text-xs shrink-0">From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="flex-1 sm:w-36 h-8 text-sm" />
        </div>
        <div className="flex items-center gap-1">
          <Label className="text-muted-foreground text-xs shrink-0">To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="flex-1 sm:w-36 h-8 text-sm" />
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          {(search || dateFrom || dateTo || filter !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setFilter("all"); }}>
              Clear
            </Button>
          )}
          {selected.size > 0 && (
            <Button variant="destructive" size="sm" onClick={bulkDelete} disabled={bulkDeleting} className="gap-1.5 h-8 text-xs">
              <Trash2 size={12} />
              {bulkDeleting ? "Deleting…" : `Delete ${selected.size}`}
            </Button>
          )}
          <span className="text-sm text-muted-foreground whitespace-nowrap">{filtered.length} shown</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">No treatments match the current filter.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox"
                    checked={filtered.length > 0 && filtered.every((t) => t._id && selected.has(t._id))}
                    onChange={toggleSelectAll}
                    className="cursor-pointer"
                    aria-label="Select all"
                  />
                </th>
                <th className="text-left px-4 py-3 font-medium">Time</th>
                <th className="text-left px-4 py-3 font-medium">Event</th>
                <th className="text-right px-4 py-3 font-medium">Insulin</th>
                <th className="text-right px-4 py-3 font-medium">Carbs</th>
                <th className="text-right px-4 py-3 font-medium">BG</th>
                <th className="text-left px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t._id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${t._id && selected.has(t._id) ? "bg-muted/50" : ""}`}>
                  <td className="px-4 py-2.5">
                    {t._id && (
                      <input type="checkbox"
                        checked={selected.has(t._id)}
                        onChange={() => toggleSelect(t._id!)}
                        className="cursor-pointer"
                        aria-label="Select row"
                      />
                    )}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                    {new Date(t.created_at).toLocaleString([], {
                      month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge className={`text-xs ${TYPE_COLOR[t.eventType] ?? "bg-gray-300 text-black"}`}>
                      {t.eventType}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {t.insulin != null ? `${t.insulin} U` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {t.carbs != null ? `${t.carbs} g` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {t.glucose != null ? `${t.glucose}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground max-w-xs truncate">
                    {t.notes ?? ""}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => openEdit(t)}
                        className="text-muted-foreground hover:text-foreground h-7 w-7"
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        disabled={deleting === t._id}
                        onClick={() => del(t._id!)}
                        className="text-muted-foreground hover:text-destructive h-7 w-7"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load More"}
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!edit} onOpenChange={(open) => !open && setEdit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {edit?.treatment.eventType}</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="space-y-4 py-2">
              {showInsulin && (
                <div className="space-y-1.5">
                  <Label>Insulin (U)</Label>
                  <Input type="number" step="0.05" min="0"
                    value={edit.insulin}
                    onChange={(e) => setEdit({ ...edit, insulin: e.target.value })} />
                </div>
              )}
              {showCarbs && (
                <div className="space-y-1.5">
                  <Label>Carbs (g)</Label>
                  <Input type="number" step="1" min="0"
                    value={edit.carbs}
                    onChange={(e) => setEdit({ ...edit, carbs: e.target.value })} />
                </div>
              )}
              {showGlucose && (
                <div className="space-y-1.5">
                  <Label>Blood Glucose (mg/dL)</Label>
                  <Input type="number" step="1" min="0"
                    value={edit.glucose}
                    onChange={(e) => setEdit({ ...edit, glucose: e.target.value })} />
                </div>
              )}
              {showDuration && (
                <div className="space-y-1.5">
                  <Label>Duration (minutes)</Label>
                  <Input type="number" step="5" min="0"
                    value={edit.duration}
                    onChange={(e) => setEdit({ ...edit, duration: e.target.value })} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea rows={2}
                  value={edit.notes}
                  onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
              </div>
              {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
