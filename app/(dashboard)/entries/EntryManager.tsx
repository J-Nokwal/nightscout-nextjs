"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import type { Entry } from "@/types/nightscout";

function entryTime(e: Entry) {
  return new Date(e.date).toLocaleString([], {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function EntryManager({ initialEntries }: { initialEntries: Entry[] }) {
  const [entries, setEntries]   = useState(initialEntries);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [edit, setEdit]         = useState<{ entry: Entry; sgv: string; mbg: string; notes: string } | null>(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  async function del(id: string) {
    if (!confirm("Delete this entry?")) return;
    setDeleting(id);
    await fetch(`/api/v3/entries/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e._id !== id));
    setDeleting(null);
  }

  function openEdit(e: Entry) {
    setEdit({
      entry: e,
      sgv:   e.sgv  != null ? String(e.sgv)  : "",
      mbg:   e.mbg  != null ? String(e.mbg)  : "",
      notes: "",
    });
    setError("");
  }

  async function saveEdit() {
    if (!edit) return;
    setSaving(true);
    setError("");
    const body: Record<string, unknown> = {};
    if (edit.sgv !== "") body.sgv = parseFloat(edit.sgv);
    if (edit.mbg !== "") body.mbg = parseFloat(edit.mbg);
    try {
      const res = await fetch(`/api/v3/entries/${edit.entry._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const { result } = await res.json() as { result: Entry };
      setEntries((prev) => prev.map((e) => e._id === result._id ? result : e));
      setEdit(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No entries found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Time</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-right px-4 py-3 font-medium">SGV</th>
                <th className="text-right px-4 py-3 font-medium">MBG</th>
                <th className="text-left px-4 py-3 font-medium">Direction</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{entryTime(e)}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline" className="text-xs">{e.type}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                    {e.sgv ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                    {e.mbg ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{e.direction ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(e)}>
                        <Pencil size={13} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        disabled={deleting === e._id}
                        onClick={() => del(e._id!)}>
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

      <Dialog open={!!edit} onOpenChange={(open) => !open && setEdit(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Entry — {edit ? entryTime(edit.entry) : ""}</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="space-y-4 py-2">
              {edit.entry.type === "sgv" && (
                <div className="space-y-1.5">
                  <Label>Sensor Glucose (mg/dL)</Label>
                  <Input type="number" step="1" min="20" max="600"
                    value={edit.sgv}
                    onChange={(e) => setEdit({ ...edit, sgv: e.target.value })} />
                </div>
              )}
              {edit.entry.type === "mbg" && (
                <div className="space-y-1.5">
                  <Label>Manual BG (mg/dL)</Label>
                  <Input type="number" step="1" min="20" max="600"
                    value={edit.mbg}
                    onChange={(e) => setEdit({ ...edit, mbg: e.target.value })} />
                </div>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
