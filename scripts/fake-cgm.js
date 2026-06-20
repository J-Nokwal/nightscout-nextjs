#!/usr/bin/env node
/* eslint-disable */
/**
 * Fake CGM data generator — posts a realistic glucose reading every minute.
 * Reads API_SECRET and AUTH_URL from .env / .env.local.
 *
 * Usage:
 *   node scripts/fake-cgm.js
 *   node scripts/fake-cgm.js --interval 30   # every 30 seconds
 *   node scripts/fake-cgm.js --unit mmol      # print values in mmol/L
 */

const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

// ── env loading ──────────────────────────────────────────────────────────────

function loadEnv(filename) {
  try {
    const raw = readFileSync(resolve(process.cwd(), filename), "utf8");
    const out = {};
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      out[key] = val;
    }
    return out;
  } catch {
    return {};
  }
}

const env = { ...loadEnv(".env"), ...loadEnv(".env.local") };
const API_SECRET = env.API_SECRET ?? process.env.API_SECRET ?? "";
const BASE_URL = (env.AUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

if (!API_SECRET) {
  console.error("❌  API_SECRET not found in .env or environment");
  process.exit(1);
}

// SHA-1 hash of API_SECRET → Authorization header (Nightscout convention)
const AUTH_HEADER = createHash("sha1").update(API_SECRET).digest("hex");

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const intervalIdx = args.indexOf("--interval");
const intervalSec = intervalIdx !== -1 ? Number(args[intervalIdx + 1]) : 60;
const unitIdx = args.indexOf("--unit");
const showMmol = unitIdx !== -1 && args[unitIdx + 1] === "mmol";

// ── BG simulation (realistic random walk with mean reversion) ────────────────

const BG_TARGET = 110; // mg/dL
const BG_MIN = 55;
const BG_MAX = 280;
const NOISE = 4;       // mg/dL random noise per step
const REVERSION = 0.03;

let bgNow = BG_TARGET + (Math.random() - 0.5) * 40;
let bgPrev = bgNow;

function nextBG() {
  bgPrev = bgNow;
  const drift = REVERSION * (BG_TARGET - bgNow);
  const noise = (Math.random() - 0.5) * 2 * NOISE;
  bgNow = Math.max(BG_MIN, Math.min(BG_MAX, bgNow + drift + noise));
  return Math.round(bgNow);
}

function direction(delta) {
  if (delta >  11) return "DoubleUp";
  if (delta >   7) return "SingleUp";
  if (delta >   3) return "FortyFiveUp";
  if (delta >  -3) return "Flat";
  if (delta >  -7) return "FortyFiveDown";
  if (delta > -11) return "SingleDown";
  return "DoubleDown";
}

// ── posting ───────────────────────────────────────────────────────────────────

async function postEntry() {
  const sgv = nextBG();
  const delta = sgv - Math.round(bgPrev);
  const dir = direction(delta);

  const entry = {
    date: Date.now(),
    dateString: new Date().toISOString(),
    type: "sgv",
    sgv,
    direction: dir,
    device: "fake-cgm-script",
    noise: 1,
  };

  try {
    const res = await fetch(`${BASE_URL}/api/v3/entries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: AUTH_HEADER,
      },
      body: JSON.stringify([entry]),
    });

    const displayBG = showMmol
      ? `${(sgv / 18.01559).toFixed(1)} mmol/L`
      : `${sgv} mg/dL`;
    const sign = delta >= 0 ? "+" : "";
    const arrows = {
      DoubleUp: "⇈", SingleUp: "↑", FortyFiveUp: "↗",
      Flat: "→",
      FortyFiveDown: "↘", SingleDown: "↓", DoubleDown: "⇊",
    };
    const arrow = arrows[dir] ?? "→";

    if (res.ok) {
      console.log(`✅  ${new Date().toLocaleTimeString()}  ${displayBG}  ${arrow}  (${sign}${delta})`);
    } else {
      const body = await res.text();
      console.error(`❌  HTTP ${res.status} — ${body}`);
    }
  } catch (err) {
    console.error(`❌  Network error: ${err.message}`);
    console.error(`    Is the dev server running at ${BASE_URL}?`);
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

console.log("🩸  Fake CGM starting");
console.log(`    Endpoint : ${BASE_URL}/api/v3/entries`);
console.log(`    Interval : ${intervalSec}s`);
console.log("    Press Ctrl+C to stop\n");

postEntry();
setInterval(postEntry, intervalSec * 1000);
