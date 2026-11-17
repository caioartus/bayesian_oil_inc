// Characters as tiny pixel maps. Each character is a palette key (see LEGEND).
import { C } from './palette.js';

const LEGEND = {
  k: C.ink,
  s: C.skin,
  S: C.skinShade,
  h: C.hair,
  p: C.cheek,
  u: C.navy,
  U: '#1d2550',
  w: C.white,
  W: '#c7d3dc',
  g: C.silver,
  G: C.slate,
  t: C.red,
  r: C.red,
  o: C.orange,
  y: C.yellow,
  n: C.green,
  l: C.lime,
  c: C.cyan,
  b: '#8a5a2b',
  d: C.dusk,
  m: '#7a7f94',
};

function build(rows) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const make = (flip) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');
    rows.forEach((r, j) => {
      for (let i = 0; i < r.length; i++) {
        const col = LEGEND[r[i]];
        if (!col) continue;
        x.fillStyle = col;
        x.fillRect(flip ? w - 1 - i : i, j, 1, 1);
      }
    });
    return c;
  };
  return { w, h, canvas: make(false), flipped: make(true) };
}

const CEO_HEAD = [
  '...kkkkkk...',
  '..khhhhhhk..',
  '.khhhhhhhhk.',
  '.khhhhhhhhk.',
  '.khhssssssk.',
  '.khsskssksk.',
  '.kspssssspk.',
  '..kssskkssk.',
  '...kkkkkkk..',
];
const CEO_BODY = [
  '..kuuwtwuuk.',
  '.kuuuwtwuuuk',
  '.kuuuutuuuuk',
  '.ksuuuuuuusk',
  '..kuuuuuuuk.',
];
const CEO_LEGS_A = ['..kUUk.kUUk.', '..kkkk.kkkk.'];
const CEO_LEGS_B = ['...kUUUUUk..', '...kkkkkkk..'];

const PROF_HEAD = [
  '.w..ww..w...',
  'wwwwwwwwww..',
  'wwkkkkkkkww.',
  '.wkssssssk..',
  '.wkcckcckw..',
  '.wkssssssk..',
  '..ksWWWWsk..',
  '..kssssssk..',
  '...kkkkkk...',
];
const PROF_BODY = [
  '..kwwnnwwk..',
  '.kwwwnnwwwk.',
  '.kwwwnnwwwk.',
  '.kswwwwwwsk.',
  '..kwwwwwwk..',
];
const PROF_LEGS_A = ['..kGGk.kGGk.', '..kkkk.kkkk.'];
const PROF_LEGS_B = ['...kGGGGGk..', '...kkkkkkk..'];

const INVESTOR_ANGRY = [
  '...kkkkk...',
  '...kdddk...',
  '...kdddk...',
  '.kkkkkkkkk.',
  '..ksssssk..',
  '..kkskksk..',
  '..ksssssk..',
  '..ksrrrsk..',
  '...kkkkk...',
  '..kmmwmmk..',
  '.kmmmtmmmk.',
  '.ksmmmmmsk.',
  '..kmmmmmk..',
  '..kdk.kdk..',
  '..kkk.kkk..',
];
const INVESTOR_HAPPY = INVESTOR_ANGRY.slice();
INVESTOR_HAPPY[5] = '..ksksksk..';
INVESTOR_HAPPY[7] = '..kskkksk..';
INVESTOR_HAPPY[11] = 'ksmmmmmmmsk';

export const SPR = {
  ceoA: build([...CEO_HEAD, ...CEO_BODY, ...CEO_LEGS_A]),
  ceoB: build([...CEO_HEAD, ...CEO_BODY, ...CEO_LEGS_B]),
  ceoHead: build(CEO_HEAD),
  profA: build([...PROF_HEAD, ...PROF_BODY, ...PROF_LEGS_A]),
  profB: build([...PROF_HEAD, ...PROF_BODY, ...PROF_LEGS_B]),
  profHead: build(PROF_HEAD),
  investorAngry: build(INVESTOR_ANGRY),
  investorHappy: build(INVESTOR_HAPPY),
};

export function drawSprite(ctx, spr, x, y, { flip = false, scale = 1 } = {}) {
  ctx.drawImage(flip ? spr.flipped : spr.canvas, Math.round(x), Math.round(y), spr.w * scale, spr.h * scale);
}
