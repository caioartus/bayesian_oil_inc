// Blueprint-style plots: data points, GP mean, ±2σ band, acquisition curve.
import { C } from '../art/palette.js';
import { rect, line, dither, drawStar } from '../art/draw.js';
import { drawText } from '../engine/font.js';

// Sample a grid array (evenly spaced over [0,1]) at position x.
export function sampleAt(arr, x) {
  const n = arr.length;
  return arr[Math.max(0, Math.min(n - 1, Math.floor(x * n)))];
}

export class Chart {
  constructor({ x, y, w, h }, yMax = 1.3) {
    Object.assign(this, { x, y, w, h, yMax });
  }

  px(x) {
    return this.x + x * (this.w - 1);
  }

  py(v) {
    return Math.round(this.y + this.h - 1 - (v / this.yMax) * (this.h - 1));
  }

  clampY(p) {
    return Math.max(this.y, Math.min(this.y + this.h - 1, p));
  }

  frame(ctx, { xLabel = 'position (m)', yLabel = 'oil (bbl/d)', ticks = true } = {}) {
    const { x, y, w, h } = this;
    rect(ctx, x - 1, y, 1, h + 1, C.bpInk);
    rect(ctx, x - 1, y + h, w + 1, 1, C.bpInk);
    if (ticks) {
      for (let i = 0; i <= 4; i++) {
        const tx = Math.round(x + (i / 4) * (w - 1));
        rect(ctx, tx, y + h + 1, 1, 2, C.bpInk);
      }
      for (const v of [0.5, 1.0]) {
        const ty = this.py(v);
        rect(ctx, x - 3, ty, 2, 1, C.bpInk);
        drawText(ctx, String(v * 1000), x - 4, ty - 3, C.bpLine2, { align: 'right' });
      }
    }
    if (yLabel) drawText(ctx, yLabel, x + 2, y - 1, C.bpLine2);
    if (xLabel) drawText(ctx, xLabel, x + w, y + h + 3, C.bpLine2, { align: 'right' });
  }

  // mu / sd are grid arrays; the band is mu ± k·sd, drawn dithered.
  band(ctx, mu, sd, k = 2, color = C.cyan) {
    ctx.fillStyle = dither(ctx, color);
    for (let c = 0; c < this.w; c++) {
      const xx = (c + 0.5) / this.w;
      const m = sampleAt(mu, xx);
      const s = sampleAt(sd, xx);
      const top = this.clampY(this.py(m + k * s));
      const bot = this.clampY(this.py(m - k * s));
      if (bot >= top) ctx.fillRect(this.x + c, top, 1, bot - top + 1);
    }
  }

  curve(ctx, ys, color, { thick = false, clip = true } = {}) {
    ctx.fillStyle = color;
    let prev = null;
    for (let c = 0; c < this.w; c++) {
      const xx = (c + 0.5) / this.w;
      let p = this.py(sampleAt(ys, xx));
      if (clip) p = this.clampY(p);
      const a = prev === null ? p : prev;
      const lo = Math.min(a, p);
      const hi = Math.max(a, p);
      ctx.fillRect(this.x + c, lo, 1, hi - lo + 1);
      if (thick) ctx.fillRect(this.x + c, lo - 1, 1, 1);
      prev = p;
    }
  }

  // Same as curve() but for a function of x.
  fn(ctx, f, color, opts) {
    const ys = new Float64Array(this.w);
    for (let c = 0; c < this.w; c++) ys[c] = f((c + 0.5) / this.w);
    this.curve(ctx, ys, color, opts);
  }

  points(ctx, drills, { color = C.orange, last = -1, t = 0 } = {}) {
    drills.forEach((d, i) => {
      const cx = Math.round(this.px(d.x));
      const cy = this.clampY(this.py(d.y));
      const pulse = i === last && Math.floor(t * 4) % 2 === 0;
      rect(ctx, cx - 2, cy - 1, 5, 3, C.ink);
      rect(ctx, cx - 1, cy - 2, 3, 5, C.ink);
      rect(ctx, cx - 1, cy - 1, 3, 3, pulse ? C.white : color);
    });
  }

  vline(ctx, x, color) {
    const cx = Math.round(this.px(x));
    for (let yy = this.y; yy < this.y + this.h; yy += 2) rect(ctx, cx, yy, 1, 1, color);
  }
}

// Draws an acquisition result {a, arg, lo, hi, flat} filling `area`.
export function drawAcquisition(ctx, area, acq, { color = C.lime, label = '', t = 0, star = true } = {}) {
  const { x, y, w, h } = area;
  rect(ctx, x - 1, y + h, w + 1, 1, C.bpInk);
  rect(ctx, x - 1, y, 1, h + 1, C.bpInk);
  const span = acq.hi - acq.lo || 1;
  ctx.fillStyle = dither(ctx, color);
  const tops = [];
  for (let c = 0; c < w; c++) {
    const v = acq.flat ? 0.5 : (sampleAt(acq.a, (c + 0.5) / w) - acq.lo) / span;
    const top = Math.round(y + h - 1 - v * (h - 2));
    tops.push(top);
    ctx.fillRect(x + c, top, 1, y + h - top);
  }
  ctx.fillStyle = color;
  tops.forEach((top, c) => {
    const p = c ? tops[c - 1] : top;
    ctx.fillRect(x + c, Math.min(p, top), 1, Math.abs(p - top) + 1);
  });
  if (label) drawText(ctx, label, x + w, y - 8, color, { align: 'right' });
  if (star && !acq.flat) {
    const ax = x + ((acq.arg + 0.5) / acq.a.length) * w;
    const blink = Math.floor(t * 3) % 2 === 0;
    for (let yy = y; yy < y + h; yy += 2) rect(ctx, Math.round(ax), yy, 1, 1, C.yellow);
    if (blink || !t) drawStar(ctx, Math.round(ax), y + 2);
  }
}

export { line };
