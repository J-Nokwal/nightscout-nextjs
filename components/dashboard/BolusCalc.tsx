"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calculator } from "lucide-react";
import { calcBolus } from "@/lib/nightscout/bolusCalc";
import type { BolusResult } from "@/lib/nightscout/bolusCalc";

interface Props {
  currentBG: number;
  iob: number;
  /** ISF in mg/dL per U */
  isf?: number;
  /** Carb ratio in g per U */
  carbRatio?: number;
  /** BG target in mg/dL */
  targetBG?: number;
}

export function BolusCalcButton({ currentBG, iob, isf = 50, carbRatio = 10, targetBG = 100 }: Props) {
  const [carbs, setCarbs] = useState("0");
  const [customBG, setCustomBG] = useState(String(currentBG));
  const [result, setResult] = useState<BolusResult | null>(null);
  const [open, setOpen] = useState(false);

  function calculate() {
    setResult(calcBolus({
      currentBG: parseFloat(customBG) || currentBG,
      targetBG,
      isf,
      carbRatio,
      carbs: parseFloat(carbs) || 0,
      iob,
    }));
  }

  async function log() {
    if (!result) return;
    await fetch("/api/v3/treatments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "Bolus Wizard",
        created_at: new Date().toISOString(),
        timestamp: Date.now(),
        insulin: result.recommended,
        carbs: parseFloat(carbs) || undefined,
        glucose: parseFloat(customBG) || undefined,
        notes: `Wizard: corr ${result.correctionBolus}U + meal ${result.mealBolus}U - IOB ${result.iobOffset}U`,
        enteredBy: "bolus-wizard",
      }),
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
        <Calculator size={16} /> Bolus Calc
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Bolus Calculator</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Current BG (mg/dL)</Label>
              <Input type="number" value={customBG} onChange={(e) => setCustomBG(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Carbs (g)</Label>
              <Input type="number" min="0" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            <div>Target: <strong>{targetBG}</strong></div>
            <div>ISF: <strong>{isf}</strong></div>
            <div>Ratio: <strong>{carbRatio} g/U</strong></div>
          </div>

          <Button onClick={calculate} className="w-full">Calculate</Button>

          {result && (
            <>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Correction bolus</span>
                  <span className="tabular-nums">{result.correctionBolus} U</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Meal bolus</span>
                  <span className="tabular-nums">{result.mealBolus} U</span>
                </div>
                <div className="flex justify-between text-orange-500">
                  <span>Active IOB</span>
                  <span className="tabular-nums">− {result.iobOffset} U</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Recommended</span>
                  <span className="tabular-nums">{result.recommended} U</span>
                </div>
              </div>
              <Button onClick={log} className="w-full bg-green-600 hover:bg-green-700">
                Log {result.recommended} U Bolus
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
