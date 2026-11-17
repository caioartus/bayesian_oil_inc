// Typewriter dialog box with an optional character portrait.
import { input } from '../engine/input.js';
import { wrap, drawLines, visibleLength, drawText } from '../engine/font.js';
import { sfx } from '../engine/sfx.js';
import { panel, rect } from '../art/draw.js';
import { C } from '../art/palette.js';
import { SPR, drawSprite } from '../art/sprites.js';

const BOX = { x: 4, y: 126, w: 312, h: 51 };
const LINES_PER_PAGE = 4;
const SPEED = 50; // chars / second

const PORTRAITS = {
  prof: { spr: SPR.profHead, name: 'PROF. BAYES', bg: C.cyan },
  ceo: { spr: SPR.ceoHead, name: 'YOU (CEO)', bg: C.yellow },
};

export class Dialog {
  constructor(pages, { portrait = null, name = null, onDone = null, tone = null, still = false, pos = 'bottom' } = {}) {
    this.box = pos === 'top' ? { ...BOX, y: 14 } : BOX;
    this.still = still; // info box: fully shown, not interactive
    this.portrait = portrait ? PORTRAITS[portrait] : null;
    this.name = name ?? this.portrait?.name ?? null;
    this.onDone = onDone;
    this.tone = tone;
    const textW = this.portrait ? 252 : 298;
    if (typeof pages === 'string') pages = [pages];
    this.pages = [];
    for (const p of pages) {
      const lines = wrap(p, textW);
      for (let i = 0; i < lines.length; i += LINES_PER_PAGE) this.pages.push(lines.slice(i, i + LINES_PER_PAGE));
    }
    this.page = 0;
    this.shown = 0;
    this.t = 0;
    this.lastBlip = 0;
    if (still) this.shown = this.total;
  }

  get total() {
    return this.pages[this.page].reduce((s, l) => s + visibleLength(l), 0);
  }

  update(dt) {
    this.t += dt;
    const before = Math.floor(this.shown);
    this.shown = Math.min(this.total, this.shown + dt * SPEED);
    if (Math.floor(this.shown) > before && Math.floor(this.shown) - this.lastBlip >= 3) {
      this.lastBlip = Math.floor(this.shown);
      sfx.type();
    }
    if (input.anyPressed()) {
      input.consume('a');
      if (this.shown < this.total) {
        this.shown = this.total;
      } else if (this.page < this.pages.length - 1) {
        this.page++;
        this.shown = 0;
        this.lastBlip = 0;
        sfx.select();
      } else {
        sfx.select();
        this.onDone?.();
      }
    }
  }

  draw(ctx) {
    const { x, y, w, h } = this.box;
    panel(ctx, x, y, w, h, C.white, C.ink, 'rgba(26,28,44,0.35)');
    rect(ctx, x + 2, y + h - 3, w - 4, 1, '#dde5ee');
    let tx = x + 8;
    if (this.portrait) {
      panel(ctx, x + 4, y + 5, 40, 34, this.portrait.bg, C.ink);
      const bob = Math.floor(this.t * 4) % 2 && this.shown < this.total ? 1 : 0;
      drawSprite(ctx, this.portrait.spr, x + 6, y + 9 - bob, { scale: 3 });
      tx = x + 52;
    }
    if (this.name) {
      const nw = Math.max(40, this.name.length * 6 + 8);
      panel(ctx, x + 4, y - 9, nw, 11, C.navy, C.ink);
      drawText(ctx, this.name, x + 8, y - 7, C.white);
    }
    drawLines(ctx, this.pages[this.page], tx, y + 6, C.ink, { maxChars: Math.floor(this.shown), hi: C.red });
    if (!this.still && this.shown >= this.total && Math.floor(this.t * 3) % 2 === 0) {
      drawText(ctx, '▼', x + w - 11, y + h - 9, C.red);
    }
  }
}
