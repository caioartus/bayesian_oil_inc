// A tiny Gaussian Process with an RBF (squared exponential) kernel.
//
//   k(x, x') = sf^2 * exp(-(x - x')^2 / (2 ell^2))
//
// The prior mean is a constant: the average of the data (or PRIOR_MEAN when
// there is none). With at most ~15 points, plain Cholesky is instant.
import { NOISE } from './field.js';

export const PRIOR_MEAN = 0.3;

export function cholesky(A, n) {
  const L = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i * n + j];
      for (let k = 0; k < j; k++) s -= L[i * n + k] * L[j * n + k];
      if (i === j) L[i * n + i] = Math.sqrt(Math.max(s, 1e-12));
      else L[i * n + j] = s / L[j * n + j];
    }
  }
  return L;
}

// Solve L z = b (forward substitution).
function solveLower(L, n, b) {
  const z = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let k = 0; k < i; k++) s -= L[i * n + k] * z[k];
    z[i] = s / L[i * n + i];
  }
  return z;
}

// Solve L^T z = b (back substitution).
function solveUpper(L, n, b) {
  const z = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let k = i + 1; k < n; k++) s -= L[k * n + i] * z[k];
    z[i] = s / L[i * n + i];
  }
  return z;
}

export class GP {
  constructor({ ell, sf, sn = NOISE }) {
    this.ell = ell;
    this.sf = sf;
    this.sn = sn;
    this.fit([], []);
  }

  k(a, b) {
    const d = a - b;
    return this.sf * this.sf * Math.exp((-0.5 * d * d) / (this.ell * this.ell));
  }

  fit(X, Y) {
    const n = X.length;
    this.X = X.slice();
    this.n = n;
    this.m = n ? Y.reduce((s, y) => s + y, 0) / n : PRIOR_MEAN;
    this.r = Y.map((y) => y - this.m);
    const K = new Float64Array(n * n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) K[i * n + j] = this.k(X[i], X[j]);
      K[i * n + i] += this.sn * this.sn;
    }
    this.L = cholesky(K, n);
    this.alpha = solveUpper(this.L, n, solveLower(this.L, n, this.r));
    return this;
  }

  predict(x) {
    const n = this.n;
    const kx = new Float64Array(n);
    let mu = this.m;
    for (let i = 0; i < n; i++) {
      kx[i] = this.k(x, this.X[i]);
      mu += kx[i] * this.alpha[i];
    }
    const v = solveLower(this.L, n, kx);
    let vv = 0;
    for (let i = 0; i < n; i++) vv += v[i] * v[i];
    const variance = Math.max(this.sf * this.sf - vv, 1e-12);
    return { mu, sd: Math.sqrt(variance) };
  }

  predictGrid(xs) {
    const mu = new Float64Array(xs.length);
    const sd = new Float64Array(xs.length);
    for (let i = 0; i < xs.length; i++) {
      const p = this.predict(xs[i]);
      mu[i] = p.mu;
      sd[i] = p.sd;
    }
    return { mu, sd };
  }

  // log p(y | X, ell, sf, sn): how well these hyperparameters explain the data.
  logMarginalLikelihood() {
    const n = this.n;
    if (!n) return 0;
    let fit = 0;
    let logDet = 0;
    for (let i = 0; i < n; i++) {
      fit += this.r[i] * this.alpha[i];
      logDet += Math.log(this.L[i * n + i]);
    }
    return -0.5 * fit - logDet - 0.5 * n * Math.log(2 * Math.PI);
  }
}

// Turn log-scores into probabilities (uniform prior over the options).
export function softmax(logs) {
  const mx = Math.max(...logs);
  const e = logs.map((l) => Math.exp(l - mx));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

// Draws smooth functions from the GP prior on a grid. Calling sample(t)
// with t moving continuously walks along an ellipse in sample space, so the
// curves "wiggle" while every frame is still a valid draw from the prior.
export class PriorSampler {
  constructor(ell, sf, xs, count, rng) {
    const n = xs.length;
    const K = new Float64Array(n * n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const d = xs[i] - xs[j];
        K[i * n + j] = sf * sf * Math.exp((-0.5 * d * d) / (ell * ell));
      }
      K[i * n + i] += 1e-4 * sf * sf;
    }
    this.n = n;
    this.L = cholesky(K, n);
    this.z = [];
    for (let c = 0; c < count; c++) {
      const z1 = new Float64Array(n);
      const z2 = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        z1[i] = gaussFrom(rng);
        z2[i] = gaussFrom(rng);
      }
      this.z.push([z1, z2]);
    }
  }

  sample(c, t, mean) {
    const n = this.n;
    const [z1, z2] = this.z[c];
    const co = Math.cos(t);
    const si = Math.sin(t);
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let k = 0; k <= i; k++) s += this.L[i * n + k] * (z1[k] * co + z2[k] * si);
      out[i] = mean + s;
    }
    return out;
  }
}

function gaussFrom(rng) {
  let u = 0;
  while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}
