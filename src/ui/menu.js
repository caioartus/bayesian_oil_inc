// Vertical choice menu, driven by arrows / A or by mouse and touch.
import { input } from '../engine/input.js';
import { drawText } from '../engine/font.js';
import { sfx } from '../engine/sfx.js';
import { panel, rect } from '../art/draw.js';
import { C } from '../art/palette.js';

export class Menu {
  // items: [{ label, sub?, bar? (0..1), tag? }]
  constructor(items, { x, y, w, title = null, cancel = false, onHover = null, start = 0, itemH = null } = {}) {
    this.items = items.map((it) => (typeof it === 'string' ? { label: it } : it));
    this.x = x;
    this.y = y;
    this.w = w;
    this.title = title;
    this.cancel = cancel;
    this.onHover = onHover;
    this.onChoose = null;
    this.sel = start;
    this.t = 0;
    this.itemH = itemH ?? (this.items.some((i) => i.bar !== undefined || i.sub) ? 21 : 12);
    this.top = y + (title ? 12 : 4);
    this.h = (title ? 12 : 4) + this.items.length * this.itemH + 4;
    this.onHover?.(this.sel);
  }

  setSel(i) {
    if (i === this.sel) return;
    this.sel = i;
    sfx.select();
    this.onHover?.(i);
  }

  itemAt(p) {
    if (!p || p.x < this.x || p.x > this.x + this.w) return -1;
    const i = Math.floor((p.y - this.top) / this.itemH);
    return i >= 0 && i < this.items.length ? i : -1;
  }

  update(dt) {
    this.t += dt;
    const n = this.items.length;
    if (input.pressed('up')) this.setSel((this.sel + n - 1) % n);
    if (input.pressed('down')) this.setSel((this.sel + 1) % n);
    const hover = this.itemAt(input.pointer);
    if (hover >= 0) this.setSel(hover);
    if (input.click) {
      const i = this.itemAt(input.click);
      if (i >= 0) {
        this.sel = i;
        this.choose(i);
      }
      return;
    }
    if (input.pressed('a')) this.choose(this.sel);
    else if (this.cancel && input.pressed('b')) this.choose(-1);
  }

  choose(i) {
    input.consume('a');
    input.consume('b');
    if (i >= 0) sfx.confirm();
    this.onChoose?.(i);
  }

  draw(ctx) {
    panel(ctx, this.x, this.y, this.w, this.h, C.white, C.ink, 'rgba(26,28,44,0.35)');
    if (this.title) {
      rect(ctx, this.x + 1, this.y + 1, this.w - 2, 10, C.navy);
      drawText(ctx, this.title, this.x + this.w / 2, this.y + 2, C.white, { align: 'center' });
    }
    this.items.forEach((it, i) => {
      const iy = this.top + i * this.itemH;
      const on = i === this.sel;
      if (on) rect(ctx, this.x + 2, iy, this.w - 4, this.itemH - 1, C.yellow);
      const arrow = on ? (Math.floor(this.t * 4) % 2 ? '▶' : '▶') : '';
      if (arrow) drawText(ctx, arrow, this.x + 4, iy + 2, C.red);
      drawText(ctx, it.label, this.x + 10, iy + 2, it.color || C.ink, { hi: C.red });
      if (it.tag) drawText(ctx, it.tag, this.x + this.w - 5, iy + 2, C.slate, { align: 'right' });
      if (it.sub) drawText(ctx, it.sub, this.x + 10, iy + 10, C.slate);
      if (it.bar !== undefined) {
        const bx = this.x + 10;
        const bw = this.w - 44;
        rect(ctx, bx, iy + 13, bw, 4, C.ink);
        rect(ctx, bx + 1, iy + 14, bw - 2, 2, C.dusk);
        rect(ctx, bx + 1, iy + 14, Math.round((bw - 2) * it.bar), 2, C.green);
        drawText(ctx, it.barLabel ?? '', this.x + this.w - 5, iy + 11, C.slate, { align: 'right' });
      }
    });
  }
}
