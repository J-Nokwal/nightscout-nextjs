// Web Audio API alarm tones — no external files needed.

type AlarmType = "urgent-low" | "low" | "high" | "urgent-high" | "stale";

interface Tone { freq: number; duration: number; reps: number; gap: number }

const TONES: Record<AlarmType, Tone> = {
  "urgent-low":  { freq: 880, duration: 0.3, reps: 4, gap: 0.1 },
  "low":         { freq: 660, duration: 0.4, reps: 2, gap: 0.2 },
  "high":        { freq: 440, duration: 0.4, reps: 2, gap: 0.2 },
  "urgent-high": { freq: 330, duration: 0.3, reps: 4, gap: 0.1 },
  "stale":       { freq: 220, duration: 0.5, reps: 1, gap: 0   },
};

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function playAlarm(type: AlarmType) {
  const tone = TONES[type];
  const ac = getCtx();
  let startAt = ac.currentTime;

  for (let i = 0; i < tone.reps; i++) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);

    osc.type = "sine";
    osc.frequency.value = tone.freq;
    gain.gain.setValueAtTime(0.4, startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + tone.duration);

    osc.start(startAt);
    osc.stop(startAt + tone.duration);
    startAt += tone.duration + tone.gap;
  }
}

export function stopAlarms() {
  ctx?.close();
  ctx = null;
}
