// Pixel drawing helpers: boxes, bubbles, lines, props and scenery.
import { C } from './palette.js';
import { drawText, textWidth as measure } from '../engine/font.js';

export function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

// Box with a 1px outline and clipped corners.
export function panel(ctx, x, y, w, h, fill = C.white, border = C.ink, shadow = null) {
  x = Math.round(x);
  y = Math.round(y);
  if (shadow) {
    rect(ctx, x + 2, y + 2, w, h, shadow);
  }
  rect(ctx, x + 1, y, w - 2, h, border);
  rect(ctx, x, y + 1, w, h - 2, border);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, fill);
}

export function line(ctx, x0, y0, x1, y1, color) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  ctx.fillStyle = color;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

export function disc(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    const hw = Math.floor(Math.sqrt(r * r - y * y + r * 0.8));
    ctx.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2 + 1, 1);
  }
}

const patterns = new Map();
// 50% checkerboard pattern, aligned to the canvas, for dithered fills.
export function dither(ctx, color) {
  let p = patterns.get(color);
  if (p) return p;
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 2;
  const x = c.getContext('2d');
  x.fillStyle = color;
  x.fillRect(0, 0, 1, 1);
  x.fillRect(1, 1, 1, 1);
  p = ctx.createPattern(c, 'repeat');
  patterns.set(color, p);
  return p;
}

// Speech bubble with a tail pointing at (tx, ty).
export function speechBubble(ctx, x, y, w, h, tx, ty) {
  panel(ctx, x, y, w, h, C.white, C.ink);
  const bx = Math.max(x + 4, Math.min(x + w - 8, tx - 2));
  const by = y + h - 1;
  for (let i = 0; i < 4; i++) {
    rect(ctx, bx + i - 1, by + i, 6 - i * 2 + 2, 1, C.ink);
    rect(ctx, bx + i, by + i - 1, 6 - i * 2, 1, C.white);
  }
  void ty;
}

// Thought bubble: cloud panel plus little circles trailing to (tx, ty).
export function thoughtBubble(ctx, x, y, w, h, tx, ty) {
  panel(ctx, x, y, w, h, C.white, C.ink);
  rect(ctx, x + 3, y - 1, w - 6, 1, C.ink);
  rect(ctx, x + 3, y + h, w - 6, 1, C.ink);
  const sx = x + w / 2;
  const sy = y + h + 2;
  const dots = [
    [0.35, 2],
    [0.7, 1],
  ];
  for (const [f, r] of dots) {
    const cx = sx + (tx - sx) * f;
    const cy = sy + (ty - sy) * f;
    disc(ctx, cx, cy, r + 1, C.ink);
    disc(ctx, cx, cy, r, C.white);
  }
}

// Text bubble sized to fit. Returns its rect.
export function drawBubbleText(ctx, lines, cx, bottomY, tx, ty, kind = 'speech') {
  const lw = Math.max(...lines.map((l) => measure(l)));
  const w = lw + 10;
  const h = lines.length * 10 + 6;
  let x = Math.round(cx - w / 2);
  x = Math.max(2, Math.min(318 - w, x));
  const y = Math.round(bottomY - h);
  if (kind === 'thought') thoughtBubble(ctx, x, y, w, h, tx, ty);
  else speechBubble(ctx, x, y, w, h, tx, ty);
  let hiStart = false;
  lines.forEach((l, i) => {
    hiStart = drawText(ctx, l, x + 5, y + 4 + i * 10, C.ink, { hi: C.red, hiStart });
  });
  return { x, y, w, h };
}

export function drawStar(ctx, x, y, color = C.yellow, outline = C.ink) {
  drawText(ctx, '★', x - 3 + 1, y - 3 + 1, outline);
  drawText(ctx, '★', x - 3, y - 3, color);
}

// Lattice oil derrick standing on (x, base), `h` tall.
export function drawDerrick(ctx, x, base, h, color = C.dusk, accent = C.red) {
  const half = Math.max(4, Math.round(h * 0.28));
  const topHalf = 1;
  line(ctx, x - half, base, x - topHalf, base - h, color);
  line(ctx, x + half, base, x + topHalf, base - h, color);
  const steps = Math.max(2, Math.floor(h / 7));
  let prev = null;
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const yy = base - f * h;
    const hw = half + (topHalf - half) * f;
    line(ctx, x - hw, yy, x + hw, yy, color);
    if (prev) {
      line(ctx, x - prev.hw, prev.y, x + hw, yy, color);
    }
    prev = { hw, y: yy };
  }
  rect(ctx, x - 2, base - h - 3, 5, 3, accent);
  rect(ctx, x, base - h - 5, 1, 2, color);
}

// Rocking pumpjack ("nodding donkey").
export function drawPumpjack(ctx, x, base, t, scale = 1) {
  const s = scale;
  const ang = Math.sin(t * 2.2) * 0.32;
  const px = x;
  const py = base - 14 * s;
  // A-frame
  line(ctx, px - 5 * s, base, px, py, C.dusk);
  line(ctx, px + 5 * s, base, px, py, C.dusk);
  line(ctx, px - 3 * s, base - 5 * s, px + 3 * s, base - 5 * s, C.dusk);
  // beam
  const L = 13 * s;
  const R = 9 * s;
  const ex = Math.cos(ang);
  const ey = Math.sin(ang);
  const hx = px - ex * L;
  const hy = py - ey * L;
  const tx = px + ex * R;
  const ty = py + ey * R;
  for (let o = -1; o <= 0; o++) line(ctx, hx, hy + o, tx, ty + o, C.red);
  // horse head
  rect(ctx, hx - 2 * s, hy - 2 * s, 3 * s, 5 * s, C.red);
  rect(ctx, hx - 2 * s, hy - 2 * s, 1, 5 * s, C.ink);
  // polished rod to the well
  line(ctx, hx - 1 * s, hy + 3 * s, hx - 1 * s, base - 2, C.silver);
  // counterweight + crank
  line(ctx, tx, ty, px + 9 * s, base - 4 * s, C.slate);
  disc(ctx, px + 9 * s, base - 4 * s, 2 * s, C.slate);
  rect(ctx, px + 6 * s, base - 2 * s, 7 * s, 2 * s, C.dusk);
  rect(ctx, hx - 4 * s, base - 2, 6 * s, 2, C.dusk);
  rect(ctx, px - 1, py - 1, 2, 2, C.ink);
}

export function drawCactus(ctx, x, base, h = 10, variant = 0) {
  const g = C.green;
  const d = C.teal;
  rect(ctx, x - 2, base - h, 4, h, d);
  rect(ctx, x - 1, base - h, 2, h, g);
  rect(ctx, x - 1, base - h - 1, 2, 1, d);
  if (variant % 2 === 0) {
    rect(ctx, x - 5, base - h + 3, 3, 2, d);
    rect(ctx, x - 5, base - h, 2, 4, d);
    rect(ctx, x - 4, base - h, 1, 4, g);
  }
  if (variant % 3 !== 2) {
    rect(ctx, x + 2, base - h + 5, 3, 2, d);
    rect(ctx, x + 3, base - h + 2, 2, 4, d);
    rect(ctx, x + 3, base - h + 2, 1, 4, g);
  }
  if (variant % 4 === 1) rect(ctx, x, base - h - 2, 1, 1, C.red);
}

export function drawCloud(ctx, x, y, s = 1) {
  disc(ctx, x, y, 4 * s, C.white);
  disc(ctx, x + 6 * s, y - 2 * s, 5 * s, C.white);
  disc(ctx, x + 13 * s, y, 4 * s, C.white);
  rect(ctx, x - 3 * s, y + 1 * s, 19 * s, 4 * s, C.white);
  rect(ctx, x - 3 * s, y + 4 * s, 19 * s, 1, '#d4e4f0');
}

export function drawFlag(ctx, x, base, color, t = 0) {
  rect(ctx, x, base - 12, 1, 12, C.ink);
  const wave = Math.round(Math.sin(t * 6 + x) * 0.6);
  rect(ctx, x + 1, base - 12, 5, 2, color);
  rect(ctx, x + 1, base - 10 + wave * 0, 4 + wave, 2, color);
  rect(ctx, x + 1, base - 12, 5, 1, C.white);
}

export function drawWellhead(ctx, x, base) {
  rect(ctx, x - 2, base - 5, 5, 5, C.slate);
  rect(ctx, x - 3, base - 6, 7, 2, C.silver);
  rect(ctx, x - 1, base - 8, 3, 2, C.red);
  rect(ctx, x - 2, base - 1, 5, 1, C.dusk);
}

export function drawPhone(ctx, x, y, ringing, t) {
  const j = ringing ? Math.round(Math.sin(t * 40)) : 0;
  panel(ctx, x + j, y, 9, 13, C.dusk, C.ink);
  rect(ctx, x + 2 + j, y + 2, 5, 6, ringing ? C.lime : C.cyan);
  rect(ctx, x + 3 + j, y + 10, 3, 1, C.silver);
}

// Yellow bouncing "walk here" arrow.
export function drawArrow(ctx, x, y, t, color = C.yellow) {
  const b = Math.round(Math.sin(t * 6) * 2);
  drawText(ctx, '▼', x - 2 + 1, y + b + 1, C.ink);
  drawText(ctx, '▼', x - 2, y + b, color);
}

export function oilColor(frac) {
  if (frac > 0.75) return C.green;
  if (frac > 0.45) return C.yellow;
  if (frac > 0.2) return C.orange;
  return C.red;
}
