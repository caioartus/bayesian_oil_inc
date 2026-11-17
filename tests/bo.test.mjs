import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GP, softmax } from '../src/bo/gp.js';
import { makeField, makeMarkers, randomBaseline } from '../src/bo/field.js';
import { expectedImprovement, acquisitionGrid, ACQ_OPTIONS, normCdf } from '../src/bo/acquisition.js';
import { mulberry32, gauss } from '../src/bo/rng.js';

test('GP posterior interpolates data and shrinks variance near it', () => {
  const X = [0.1, 0.4, 0.8];
  const Y = [0.2, 0.9, 0.4];
  const gp = new GP({ ell: 0.1, sf: 0.3, sn: 0.001 }).fit(X, Y);
  X.forEach((x, i) => {
    const p = gp.predict(x);
    assert.ok(Math.abs(p.mu - Y[i]) < 1e-3, `mean at ${x}`);
    assert.ok(p.sd < 0.01, `sd at ${x}`);
  });
  const far = gp.predict(0.6);
  assert.ok(far.sd > 0.15, 'uncertain between wells');
  const veryFar = new GP({ ell: 0.02, sf: 0.3, sn: 0.001 }).fit(X, Y).predict(0.6);
  assert.ok(Math.abs(veryFar.sd - 0.3) < 1e-3, 'reverts to prior sd far away');
});

test('marginal likelihood prefers the generating length-scale', () => {
  const rng = mulberry32(42);
  // sample a smooth function with ell=0.06 via a GP-like bump sum
  const X = [];
  const Y = [];
  const f = (x) => 0.4 * Math.sin(x * 2 * Math.PI * 4) + 0.3;
  for (let i = 0; i < 25; i++) {
    const x = rng();
    X.push(x);
    Y.push(f(x) + 0.02 * gauss(rng));
  }
  const lml = [0.01, 0.06, 0.5].map((ell) => new GP({ ell, sf: 0.3 }).fit(X, Y).logMarginalLikelihood());
  assert.ok(lml[1] > lml[0] && lml[1] > lml[2], `lml ${lml}`);
  const p = softmax(lml);
  assert.ok(Math.abs(p.reduce((a, b) => a + b) - 1) < 1e-9);
});

test('EI is non-negative and grows with mean and uncertainty', () => {
  assert.ok(expectedImprovement(0.1, 0.0, 0.5) >= 0);
  assert.ok(expectedImprovement(0.6, 0.1, 0.5) > expectedImprovement(0.4, 0.1, 0.5));
  assert.ok(expectedImprovement(0.4, 0.3, 0.5) > expectedImprovement(0.4, 0.1, 0.5));
  assert.ok(Math.abs(normCdf(0) - 0.5) < 1e-6);
  assert.ok(Math.abs(normCdf(1.96) - 0.975) < 1e-3);
});

test('acquisition grid handles the no-data (flat) case', () => {
  const gp = new GP({ ell: 0.06, sf: 0.3 });
  const xs = Array.from({ length: 50 }, (_, i) => i / 49);
  const { mu, sd } = gp.predictGrid(xs);
  for (const opt of ACQ_OPTIONS) {
    const r = acquisitionGrid(opt, mu, sd, gp.m);
    assert.ok(r.flat);
    assert.equal(r.arg, 25);
  }
});

test('fields have a unique interior global max away from the markers', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const markers = makeMarkers(seed);
    const field = makeField(seed, markers);
    assert.ok(field.maxX > 0.07 && field.maxX < 0.93, `seed ${seed} maxX ${field.maxX}`);
    for (const m of markers) {
      assert.ok(Math.abs(m - field.maxX) > 0.06, `seed ${seed} marker ${m} sits on the main peak`);
    }
    for (let i = 0; i <= 200; i++) {
      const x = i / 200;
      if (Math.abs(x - field.maxX) > 0.2) assert.ok(field.f(x) < field.maxY / 1.1);
    }
  }
});

test('random baseline is a fraction in (0, 1]', () => {
  const field = makeField(7);
  const r = randomBaseline(field, 12, 200);
  assert.ok(r > 0.2 && r <= 1, `baseline ${r}`);
});
