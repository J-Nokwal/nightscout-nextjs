"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Search } from "lucide-react";
import { BUILT_IN_FOODS, type FoodItem } from "@/lib/nightscout/foodDb";

interface CustomFood extends FoodItem {
  id: string;
}

const STORAGE_KEY = "ns_custom_foods";

function loadCustom(): CustomFood[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch { return []; }
}

function saveCustom(foods: CustomFood[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(foods));
}

const EMPTY_FORM: Omit<FoodItem, "name"> & { name: string } = {
  name: "", category: "Custom", carbs: 0, fat: 0, protein: 0, calories: 0, weight: 100, unit: "g",
};

export function FoodEditor() {
  const [custom, setCustom]     = useState<CustomFood[]>(() => loadCustom());
  const [search, setSearch]     = useState("");
  const [form, setForm]         = useState({ ...EMPTY_FORM });
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved]       = useState(false);

  const allFoods = [
    ...custom.map((f) => ({ ...f, isCustom: true })),
    ...BUILT_IN_FOODS.map((f) => ({ ...f, id: "", isCustom: false })),
  ];

  const filtered = allFoods.filter((f) =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.category.toLowerCase().includes(search.toLowerCase())
  );

  function addFood() {
    if (!form.name.trim()) return;
    const entry: CustomFood = { ...form, id: `custom_${Date.now()}` };
    const updated = [entry, ...custom];
    setCustom(updated);
    saveCustom(updated);
    setForm({ ...EMPTY_FORM });
    setShowForm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function deleteCustom(id: string) {
    const updated = custom.filter((f) => f.id !== id);
    setCustom(updated);
    saveCustom(updated);
  }

  function patchForm(fields: Partial<typeof EMPTY_FORM>) {
    setForm((prev) => ({ ...prev, ...fields }));
  }

  const categories = [...new Set(allFoods.map((f) => f.category))].sort();

  return (
    <div className="space-y-4">
      {/* Search + Add */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search foods…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="gap-1">
          <Plus size={14} /> Add Custom Food
        </Button>
        {saved && <Badge className="bg-green-600 text-white">Saved ✓</Badge>}
      </div>

      {/* Add form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">New Custom Food</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="col-span-2 sm:col-span-1 space-y-1">
                <Label className="text-xs">Name *</Label>
                <Input value={form.name} onChange={(e) => patchForm({ name: e.target.value })} placeholder="e.g. Chapati" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Input value={form.category} onChange={(e) => patchForm({ category: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Unit / serving</Label>
                <Input value={form.unit} onChange={(e) => patchForm({ unit: e.target.value })} placeholder="piece / cup / g" />
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {(["carbs", "fat", "protein", "calories", "weight"] as const).map((field) => (
                <div key={field} className="space-y-1">
                  <Label className="text-xs capitalize">{field} {field === "calories" ? "(kcal)" : field === "weight" ? "(g)" : "(g)"}</Label>
                  <Input
                    type="number" min="0" step="0.1"
                    value={form[field]}
                    onChange={(e) => patchForm({ [field]: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={addFood} disabled={!form.name.trim()}>Save Food</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => setSearch("")}
          className={`text-xs px-2 py-1 rounded-full border transition-colors ${!search ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-foreground"}`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSearch(cat)}
            className={`text-xs px-2 py-1 rounded-full border transition-colors ${search === cat ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-foreground"}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Food table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-xs text-muted-foreground">
              <th className="text-left px-3 py-2 font-medium">Name</th>
              <th className="text-left px-3 py-2 font-medium">Category</th>
              <th className="text-right px-3 py-2 font-medium">Carbs</th>
              <th className="text-right px-3 py-2 font-medium">Fat</th>
              <th className="text-right px-3 py-2 font-medium">Protein</th>
              <th className="text-right px-3 py-2 font-medium">Cal</th>
              <th className="text-left px-3 py-2 font-medium">Serving</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.slice(0, 100).map((f, i) => (
              <tr key={f.isCustom ? f.id : `builtin-${i}`} className="hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">
                  {f.name}
                  {f.isCustom && <Badge className="ml-2 text-xs bg-blue-500 text-white">Custom</Badge>}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{f.category}</td>
                <td className="px-3 py-2 text-right tabular-nums">{f.carbs}g</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{f.fat}g</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{f.protein}g</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{f.calories}</td>
                <td className="px-3 py-2 text-muted-foreground">{f.weight}g / {f.unit}</td>
                <td className="px-2 py-2">
                  {f.isCustom && (
                    <button
                      onClick={() => deleteCustom(f.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No foods found</td></tr>
            )}
          </tbody>
        </table>
        {filtered.length > 100 && (
          <p className="text-xs text-muted-foreground px-3 py-2">Showing 100 of {filtered.length} — refine your search</p>
        )}
      </div>
    </div>
  );
}
