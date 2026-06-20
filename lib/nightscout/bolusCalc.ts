export interface BolusInput {
  currentBG: number;     // mg/dL
  targetBG: number;      // mg/dL
  isf: number;           // mg/dL per U
  carbRatio: number;     // g per U
  carbs: number;         // g to eat
  iob: number;           // U already active
}

export interface BolusResult {
  correctionBolus: number;   // U for BG correction
  mealBolus: number;         // U for carbs
  iobOffset: number;         // U subtracted for existing IOB
  recommended: number;       // total recommended (>= 0)
}

export function calcBolus(input: BolusInput): BolusResult {
  const { currentBG, targetBG, isf, carbRatio, carbs, iob } = input;

  const correctionBolus = isf > 0 ? (currentBG - targetBG) / isf : 0;
  const mealBolus       = carbRatio > 0 ? carbs / carbRatio : 0;
  const iobOffset       = iob;
  const recommended     = Math.max(0, correctionBolus + mealBolus - iobOffset);

  return {
    correctionBolus: Math.round(correctionBolus * 100) / 100,
    mealBolus:       Math.round(mealBolus * 100) / 100,
    iobOffset:       Math.round(iobOffset * 100) / 100,
    recommended:     Math.round(recommended * 100) / 100,
  };
}
