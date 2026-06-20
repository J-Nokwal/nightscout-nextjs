// AR2 forecasting — ported from Nightscout's lib/plugins/ar2.js
// Autoregressive second-order model predicting BG 30 minutes ahead.

const AR = [-0.723, 1.716] as const;
const BG_REF = 140;
const BG_MIN = 36;
const BG_MAX = 400;
const STEP_MS = 5 * 60 * 1000; // 5 minutes

// Cone steps from the original Nightscout source
const CONE_STEPS = [0.020, 0.041, 0.061, 0.081, 0.099, 0.116, 0.132, 0.146, 0.159, 0.171, 0.182, 0.192, 0.201] as const;

export interface AR2Point {
  mills: number;
  mgdl: number;
}

export interface AR2ConePoint {
  mills: number;
  mgdlLow: number;
  mgdlHigh: number;
}

export interface AR2Result {
  predicted: AR2Point[];
  cone: AR2ConePoint[];
  /** 0–1 scale; >0.10 = urgent, >0.05 = warn */
  avgLoss: number;
  alertLevel: "none" | "warn" | "urgent";
}

interface AR2State {
  forecastTime: number;
  points: AR2Point[];
  prev: number; // log-space
  curr: number; // log-space
}

function clamp(v: number) {
  return Math.max(BG_MIN, Math.min(BG_MAX, v));
}

function ar2mgdl(logVal: number, coneFactor = 0, step = 0): number {
  return clamp(BG_REF * Math.exp(logVal + coneFactor * step));
}

function incrementAR2(state: AR2State): AR2State {
  return {
    forecastTime: state.forecastTime + STEP_MS,
    points: state.points,
    prev: state.curr,
    curr: AR[0] * state.prev + AR[1] * state.curr,
  };
}

/**
 * @param currentMgdl  Latest SGV reading (mg/dL)
 * @param prev5MinMgdl SGV reading ~5 minutes ago (mg/dL)
 * @param currentMills Timestamp of the latest reading (ms epoch)
 */
export function ar2Forecast(
  currentMgdl: number,
  prev5MinMgdl: number,
  currentMills: number
): AR2Result {
  if (currentMgdl < BG_MIN || prev5MinMgdl <= 0) {
    return { predicted: [], cone: [], avgLoss: 0, alertLevel: "none" };
  }

  const init: AR2State = {
    forecastTime: currentMills,
    points: [],
    prev: Math.log(prev5MinMgdl / BG_REF),
    curr: Math.log(currentMgdl / BG_REF),
  };

  // Generate 6 forecast points (~30 min ahead)
  let state = init;
  const predicted: AR2Point[] = [];
  for (let i = 0; i < 6; i++) {
    state = incrementAR2(state);
    predicted.push({ mills: state.forecastTime + 2000, mgdl: ar2mgdl(state.curr) });
  }

  // avgLoss for alert level
  const size = Math.min(predicted.length - 1, 6);
  let avgLoss = 0;
  for (let j = 0; j <= size; j++) {
    avgLoss += (1 / size) * Math.pow(Math.log10(predicted[j].mgdl / 120), 2);
  }

  // Forecast cone (13 steps, each has low+high bound)
  let coneState = { ...init, points: [] as AR2Point[] };
  const cone: AR2ConePoint[] = [];
  for (const step of CONE_STEPS) {
    coneState = incrementAR2(coneState);
    cone.push({
      mills: coneState.forecastTime + 2000,
      mgdlLow: ar2mgdl(coneState.curr, -1, step),
      mgdlHigh: ar2mgdl(coneState.curr, 1, step),
    });
  }

  const alertLevel: AR2Result["alertLevel"] =
    avgLoss > 0.1 ? "urgent" : avgLoss > 0.05 ? "warn" : "none";

  return { predicted, cone, avgLoss, alertLevel };
}
