// The desert backdrop: dithered sky, parallax mesas, clouds and sandy ground.
// Static layers are rendered once to offscreen canvases.
import { C } from './palette.js';
import { rect, dither, drawCactus, drawCloud } from './draw.js';
import { mulberry32 } from '../bo/rng.js';

export const HORIZON = 132;
export const GROUND_Y = 154; // where feet / wells touch the ground
export const WORLD_W = 960;

let sky = null;
let mesas = null;
let far = null;
let ground = null;
const GROUND_TOP = 100;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function buildSky() {
  const c = canvas(320, HORIZON);
  const x = c.getContext('2d');
  const bands = [
    [0, C.skyTop],
    [55, C.skyMid],
    [100, C.skyLow],
  ];
  for (let i = 0; i < bands.length; i++) {
    const [y0, col] = bands[i];
    const y1 = i + 1 < bands.length ? bands[i + 1][0] : HORIZON;
    rect(x, 0, y0, 320, y1 - y0, col);
    if (i + 1 < bands.length) {
      x.fillStyle = dither(x, bands[i + 1][1]);
      x.fillRect(0, y1 - 6, 320, 6);
    }
  }
  // sun
  x.fillStyle = '#fff3c4';
  for (let yy = -9; yy <= 9; yy++) {
    const hw = Math.floor(Math.sqrt(81 - yy * yy));
    x.fillRect(262 - hw, 30 + yy, hw * 2 + 1, 1);
  }
  x.fillStyle = C.yellow;
  for (let yy = -7; yy <= 7; yy++) {
    const hw = Math.floor(Math.sqrt(49 - yy * yy));
    x.fillRect(262 - hw, 30 + yy, hw * 2 + 1, 1);
  }
  return c;
}

function buildRange(width, seed, col, dark, minH, maxH, flat) {
  const c = canvas(width, HORIZON);
  const x = c.getContext('2d');
  const rng = mulberry32(seed);
  let px = -20;
  while (px < width + 20) {
    const w = 20 + rng() * 50;
    const h = minH + rng() * (maxH - minH);
    const slope = 4 + rng() * 6;
    const top = HORIZON - h;
    for (let yy = Math.floor(top); yy < HORIZON; yy++) {
      const f = (yy - top) / h;
      const spread = flat ? Math.min(slope, f * slope * 3) : f * w * 0.5;
      const x0 = flat ? px - spread : px + w / 2 - spread;
      const x1 = flat ? px + w + spread : px + w / 2 + spread;
      x.fillStyle = col;
      x.fillRect(Math.round(x0), yy, Math.round(x1 - x0), 1);
    }
    if (flat) {
      rect(x, px, top, w, 1, '#f0b088');
      x.fillStyle = dark;
      x.fillRect(Math.round(px - 2), Math.round(top + h * 0.45), Math.round(w + 4), 2);
      x.fillRect(Math.round(px - 4), Math.round(top + h * 0.75), Math.round(w + 8), 1);
    }
    px += w + rng() * 40 + (flat ? 10 : -10);
  }
  return c;
}

function buildGround() {
  const h = 180 - GROUND_TOP;
  const c = canvas(WORLD_W + 40, h);
  const x = c.getContext('2d');
  const oy = -GROUND_TOP;
  rect(x, 0, HORIZON + oy, c.width, 180 - HORIZON, C.sand);
  x.fillStyle = dither(x, C.sandDark);
  x.fillRect(0, HORIZON + oy, c.width, 2);
  rect(x, 0, HORIZON + oy, c.width, 1, C.sandDark);
  rect(x, 0, 168 + oy, c.width, 12, C.sandDark);
  x.fillStyle = dither(x, C.sandDark);
  x.fillRect(0, 164 + oy, c.width, 4);
  x.fillStyle = dither(x, C.sandDeep);
  x.fillRect(0, 176 + oy, c.width, 4);

  const rng = mulberry32(99);
  // pebbles and tufts
  for (let i = 0; i < 260; i++) {
    const px = Math.floor(rng() * c.width);
    const py = HORIZON + 3 + Math.floor(rng() * 44);
    const r = rng();
    if (r < 0.6) rect(x, px, py + oy, 2, 1, r < 0.3 ? C.sandDeep : C.sandDark);
    else if (r < 0.8) {
      rect(x, px, py + oy, 1, 1, C.mesaDark);
      rect(x, px + 1, py + oy, 1, 1, '#fff0c8');
    } else {
      rect(x, px, py + oy - 1, 1, 2, C.green);
      rect(x, px + 2, py + oy - 1, 1, 2, C.green);
      rect(x, px + 1, py + oy - 2, 1, 3, C.teal);
    }
  }
  // background cacti (behind the walking line)
  for (let i = 0; i < 16; i++) {
    const px = 20 + Math.floor(rng() * (c.width - 40));
    const py = HORIZON + 4 + Math.floor(rng() * 10);
    drawCactus(x, px, py + oy, 7 + Math.floor(rng() * 6), i);
  }
  return c;
}

export function initScenery() {
  if (sky) return;
  sky = buildSky();
  far = buildRange(320 + Math.ceil((WORLD_W - 320) * 0.15) + 40, 5, '#e9c8b0', '#dcb399', 14, 30, false);
  mesas = buildRange(320 + Math.ceil((WORLD_W - 320) * 0.35) + 40, 11, C.mesa, C.mesaDark, 16, 34, true);
  ground = buildGround();
}

const CLOUDS = [
  [30, 22, 1],
  [140, 40, 1],
  [230, 14, 1],
  [330, 34, 1],
  [430, 20, 1],
];

// Draws the sky, ranges, clouds and ground for camera offset camX.
export function drawDesert(ctx, camX, t) {
  initScenery();
  ctx.drawImage(sky, 0, 0);
  for (const [cx, cy, s] of CLOUDS) {
    const span = 480;
    let x = (((cx - camX * 0.08 + t * 3) % span) + span) % span - 60;
    drawCloud(ctx, Math.round(x), cy, s);
  }
  ctx.drawImage(far, -Math.round(camX * 0.15), 0);
  ctx.drawImage(mesas, -Math.round(camX * 0.35), 0);
  ctx.drawImage(ground, -Math.round(camX), GROUND_TOP);
}
