// Acquisition functions: a score for how worth drilling each spot is.

// Abramowitz & Stegun 7.1.26
function erf(x) {
  const s = Math.sign(x);
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return s * y;
}

export const normCdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
export const normPdf = (z) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);

export const XI = 0.01;

export function expectedImprovement(mu, sd, best, xi = XI) {
  const imp = mu - best - xi;
  if (sd < 1e-9) return Math.max(imp, 0);
  const z = imp / sd;
  return imp * normCdf(z) + sd * normPdf(z);
}

export function probabilityOfImprovement(mu, sd, best, xi = XI) {
  if (sd < 1e-9) return mu > best + xi ? 1 : 0;
  return normCdf((mu - best - xi) / sd);
}

export const ucb = (mu, sd, kappa) => mu + kappa * sd;

export const ACQ_OPTIONS = [
  {
    id: 'ei',
    label: 'Expected Improv.',
    short: 'EI',
    desc: '*Expected Improvement*: on average, how much better than our best well could this spot be? It balances explore and exploit on its own, and it is the classic choice.',
  },
  {
    id: 'pi',
    label: 'Prob. of Improv.',
    short: 'PI',
    desc: '*Probability of Improvement*: the chance this spot beats our best well, even by a drop. It is cautious and tends to creep around the current best.',
  },
  {
    id: 'ucb',
    kappa: 1,
    label: 'UCB k=1 (calm)',
    short: 'UCB1',
    desc: '*Upper Confidence Bound*: mean + k*std. With k=1 it mostly trusts the mean, so it exploits a lot.',
  },
  {
    id: 'ucb',
    kappa: 2,
    label: 'UCB k=2',
    short: 'UCB2',
    desc: '*Upper Confidence Bound* with k=2: the top of the band. Optimism in the face of uncertainty! A solid, balanced choice.',
  },
  {
    id: 'ucb',
    kappa: 3,
    label: 'UCB k=3 (bold)',
    short: 'UCB3',
    desc: '*UCB* with k=3 is very optimistic about the unknown, so it explores boldly before settling down.',
  },
  {
    id: 'mean',
    label: 'Greedy (mean)',
    short: 'MEAN',
    foil: true,
    desc: '*Greedy*: just drill where the mean is highest. Pure exploitation. Hmm... what if a bigger reservoir hides where we never looked?',
  },
  {
    id: 'std',
    label: 'Explorer (std)',
    short: 'STD',
    foil: true,
    desc: '*Pure exploration*: drill wherever we are most uncertain. Great for mapping the field, terrible for actually finding the jackpot fast.',
  },
];

export function acquisitionValue(opt, mu, sd, best) {
  switch (opt.id) {
    case 'ei':
      return expectedImprovement(mu, sd, best);
    case 'pi':
      return probabilityOfImprovement(mu, sd, best);
    case 'ucb':
      return ucb(mu, sd, opt.kappa);
    case 'mean':
      return mu;
    case 'std':
      return sd;
    default:
      return 0;
  }
}

// Evaluates the acquisition on a grid; returns the values and the argmax.
export function acquisitionGrid(opt, mu, sd, best) {
  const n = mu.length;
  const a = new Float64Array(n);
  let arg = 0;
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < n; i++) {
    a[i] = acquisitionValue(opt, mu[i], sd[i], best);
    if (a[i] > hi) {
      hi = a[i];
      arg = i;
    }
    lo = Math.min(lo, a[i]);
  }
  const flat = hi - lo < 1e-9;
  if (flat) arg = Math.floor(n / 2);
  return { a, arg, lo, hi, flat };
}
