// The hidden oil field: f(x) for x in [0, 1] (0 to 1000 m of desert).
//
// Oil collects in structural traps (anticlines), so the yield along the strip
// looks like a few Gaussian "reservoir" bumps (one main field and some smaller
// decoys) on top of a gentle low-frequency background. The result is smooth,
// so a Gaussian Process with a sensible length-scale models it well.
import { mulberry32, gauss } from './rng.js';

export const NOISE = 0.02; // measurement noise (std) in yield units
export const BBL = 1000; // 1.0 yield unit = 1000 barrels/day

export function toBbl(y) {
  return Math.max(0, Math.round(y * BBL));
}

// Spread-out positions for the tutorial's "naive" first drills.
export function makeMarkers(seed, count = 4) {
  const rng = mulberry32(seed * 7 + 13);
  const xs = [];
  for (let i = 0; i < count; i++) {
    xs.push((i + 0.5) / count + (rng() - 0.5) * 0.08);
  }
  return xs;
}

// `avoid`: positions that must not sit on the main reservoir (the tutorial
// markers), so the naive phase never finds the jackpot by luck.
export function makeField(seed, avoid = []) {
  for (let s = seed; ; s++) {
    const field = tryField(s, avoid);
    if (field) return { ...field, seed };
  }
}

function tryField(seed, avoid) {
  const rng = mulberry32(seed);
  for (let attempt = 0; attempt < 200; attempt++) {
    const main = { c: 0.1 + 0.8 * rng(), a: 0.85 + 0.2 * rng(), w: 0.04 + 0.03 * rng() };
    if (avoid.some((x) => Math.abs(x - main.c) < 1.6 * main.w)) continue;

    const bumps = [main];
    const decoys = 2 + (rng() < 0.5 ? 1 : 0);
    for (let tries = 0; bumps.length < decoys + 1 && tries < 200; tries++) {
      const c = 0.04 + 0.92 * rng();
      if (Math.abs(c - main.c) < 0.18) continue;
      if (bumps.some((b) => Math.abs(b.c - c) < 0.12)) continue;
      bumps.push({ c, a: main.a * (0.35 + 0.37 * rng()), w: 0.035 + 0.045 * rng() });
    }
    const waves = [0, 1, 2].map(() => ({
      A: 0.015 + 0.03 * rng(),
      f: 0.6 + 1.6 * rng(),
      p: rng() * Math.PI * 2,
    }));
    const base = 0.06 + 0.06 * rng();

    const f = (x) => {
      let v = base;
      for (const w of waves) v += w.A * Math.sin(2 * Math.PI * w.f * x + w.p);
      for (const b of bumps) {
        const d = x - b.c;
        v += b.a * Math.exp((-0.5 * d * d) / (b.w * b.w));
      }
      return Math.max(0.01, v);
    };

    // Validate: unique interior global max on the main bump, clear margin.
    const N = 1000;
    let maxX = 0;
    let maxY = -1;
    let second = 0;
    for (let i = 0; i <= N; i++) {
      const x = i / N;
      const y = f(x);
      if (y > maxY) {
        maxY = y;
        maxX = x;
      }
      if (Math.abs(x - main.c) > 3 * main.w) second = Math.max(second, y);
    }
    if (Math.abs(maxX - main.c) > 0.02 || maxX < 0.08 || maxX > 0.92) continue;
    if (maxY < 1.15 * second) continue;

    const noiseRng = mulberry32(seed ^ 0x9e3779b9);
    return {
      f,
      bumps,
      base,
      waves,
      maxX,
      maxY,
      measure: (x) => f(x) + NOISE * gauss(noiseRng),
    };
  }
  return null;
}

// Average fraction of the true max a random driller gets: drill `n` random
// spots, then build the rig on the best measured one.
export function randomBaseline(field, n, sims = 400, seed = 1) {
  const rng = mulberry32(seed * 31 + 7);
  let total = 0;
  for (let s = 0; s < sims; s++) {
    let bestX = 0;
    let bestY = -Infinity;
    for (let i = 0; i < n; i++) {
      const x = rng();
      const y = field.f(x) + NOISE * gauss(rng);
      if (y > bestY) {
        bestY = y;
        bestX = x;
      }
    }
    total += field.f(bestX) / field.maxY;
  }
  return total / sims;
}
