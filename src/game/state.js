// Play state + helpers that connect the game to the BO maths.
import { makeField, makeMarkers } from '../bo/field.js';
import { GP, softmax } from '../bo/gp.js';
import { ACQ_OPTIONS, acquisitionGrid } from '../bo/acquisition.js';
import { randomSeed } from '../bo/rng.js';

export const PERMITS = 12;
export const NAIVE = 4;
export const GRID = 320;
export const XS = Float64Array.from({ length: GRID }, (_, i) => (i + 0.5) / GRID);

// Length-scale options, framed as reports from neighbouring fields.
// x is in [0,1] = 1000 m, so ell = 0.06 means about 60 m.
export const ELL_OPTIONS = [
  {
    ell: 0.02,
    label: 'Narrow pockets',
    tag: '20m',
    report: '*Swamp Basin report*: "Oil there sat in tiny pockets about 20 m wide. Step a bit and it is gone." A short length-scale gives very wiggly functions.',
  },
  {
    ell: 0.06,
    label: 'Medium traps',
    tag: '60m',
    report: '*Dusty Ridge report*: "Reservoirs were traps around 50-70 m wide." A medium length-scale: smooth bumps of moderate size.',
  },
  {
    ell: 0.25,
    label: 'Broad basins',
    tag: '250m',
    report: '*Great Plains report*: "One huge, gently curving basin." A long length-scale means the GP believes oil barely changes along the strip.',
  },
];

export const SF_OPTIONS = [
  { sf: 0.1, label: 'A little', tag: '±100', report: 'Signal amplitude *σ = 100 bbl/d*: we expect yields to differ only a little from spot to spot.' },
  { sf: 0.3, label: 'Moderately', tag: '±300', report: 'Signal amplitude *σ = 300 bbl/d*: some spots are dry, others are rich. A typical spread for desert fields.' },
  { sf: 0.8, label: 'A lot', tag: '±800', report: 'Signal amplitude *σ = 800 bbl/d*: wild swings expected. The GP will stay very uncertain away from wells.' },
];

export function newGame(mode, seed = randomSeed()) {
  const markers = mode === 'story' ? makeMarkers(seed, NAIVE) : [];
  return {
    mode,
    seed,
    markers,
    field: makeField(seed, markers),
    drills: [],
    permits: PERMITS,
    ell: 1,
    sf: 1,
    acq: 0,
    playerPx: 60,
    rigX: null,
    seen: {},
  };
}

export const permitsLeft = (s) => s.permits - s.drills.length;

export function priorOf(s, ell = s.ell, sf = s.sf) {
  return { ell: ELL_OPTIONS[ell].ell, sf: SF_OPTIONS[sf].sf };
}

export function fitGP(s, prior = priorOf(s)) {
  return new GP(prior).fit(
    s.drills.map((d) => d.x),
    s.drills.map((d) => d.y),
  );
}

export function bestDrill(s) {
  let best = null;
  for (const d of s.drills) if (!best || d.y > best.y) best = d;
  return best;
}

export function analyze(s, { acq = s.acq, prior = priorOf(s) } = {}) {
  const gp = fitGP(s, prior);
  const { mu, sd } = gp.predictGrid(XS);
  const bd = bestDrill(s);
  const best = bd ? bd.y : gp.m;
  const a = acquisitionGrid(ACQ_OPTIONS[acq], mu, sd, best);
  let meanArg = 0;
  for (let i = 1; i < GRID; i++) if (mu[i] > mu[meanArg]) meanArg = i;
  return { gp, mu, sd, acq: a, best, argX: XS[a.arg], meanArgX: XS[meanArg] };
}

// Relative evidence (marginal likelihood, uniform prior over options).
export function evidence(s, which) {
  if (s.drills.length < 2) return null;
  const opts = which === 'ell' ? ELL_OPTIONS : SF_OPTIONS;
  const logs = opts.map((_, i) => fitGP(s, which === 'ell' ? priorOf(s, i, s.sf) : priorOf(s, s.ell, i)).logMarginalLikelihood());
  return softmax(logs);
}
