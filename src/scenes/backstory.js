import { Scene } from '../game/scene.js';
import { game } from '../game/game.js';
import { input } from '../engine/input.js';
import { sfx } from '../engine/sfx.js';
import { drawText } from '../engine/font.js';
import { STORY, INVESTOR_SHOUTS } from '../game/dialogue.js';
import { drawDesert, GROUND_Y } from '../art/scenery.js';
import { rect, panel, line, drawPumpjack, speechBubble, dither } from '../art/draw.js';
import { SPR, drawSprite } from '../art/sprites.js';
import { C } from '../art/palette.js';
import { FieldScene } from './field.js';

export class BackstoryScene extends Scene {
  enter() {
    this.panel = 0;
    this.pt = 0;
    this.script();
  }

  async script() {
    for (let i = 0; i < STORY.length; i++) {
      this.panel = i;
      this.pt = 0;
      if (i === 1) sfx.bad();
      if (i === 2) sfx.shout();
      if (i === 3) sfx.confirm();
      await this.say(STORY[i]);
    }
    game.go(new FieldScene('naive'));
  }

  update(dt) {
    this.pt += dt;
    this.baseUpdate(dt);
    if (input.pressed('b')) game.go(new FieldScene('naive'));
  }

  draw(ctx) {
    // Desert panels are lifted so the caption box doesn't hide them.
    const lift = this.panel === 0 || this.panel === 3 ? -34 : 0;
    rect(ctx, 0, 0, 320, 180, C.sandDark);
    ctx.save();
    ctx.translate(0, lift);
    [this.drawHQ, this.drawCrash, this.drawBoard, this.drawPermit][this.panel].call(this, ctx);
    ctx.restore();
    drawText(ctx, 'B: skip', 316, 3, C.white, { align: 'right', shadow: C.ink });
    this.drawOverlay(ctx);
  }

  drawHQ(ctx) {
    const t = this.t;
    drawDesert(ctx, 120, t);
    const bx = 110;
    const by = GROUND_Y - 4;
    // building
    rect(ctx, bx - 1, by - 49, 102, 50, C.ink);
    rect(ctx, bx, by - 48, 100, 48, '#e6d2b5');
    rect(ctx, bx, by - 48, 100, 4, C.mesaDark);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 6; c++) {
        const lit = (r * 7 + c * 3) % 5 !== 0;
        rect(ctx, bx + 8 + c * 15, by - 38 + r * 11, 9, 7, C.ink);
        rect(ctx, bx + 9 + c * 15, by - 37 + r * 11, 7, 5, lit ? C.cyan : C.slate);
      }
    }
    rect(ctx, bx + 44, by - 12, 12, 12, C.brown);
    // sign
    panel(ctx, bx + 6, by - 64, 88, 14, C.navy, C.ink);
    drawText(ctx, 'BAYESIAN OIL INC.', bx + 50, by - 61, C.yellow, { align: 'center' });
    rect(ctx, bx + 20, by - 50, 2, 2, C.ink);
    rect(ctx, bx + 78, by - 50, 2, 2, C.ink);
    drawPumpjack(ctx, 50, GROUND_Y, t, 1);
    drawPumpjack(ctx, 260, GROUND_Y + 4, t + 0.8, 1.5);
  }

  drawCrash(ctx) {
    rect(ctx, 0, 0, 320, 180, C.ink);
    panel(ctx, 20, 10, 280, 108, C.dusk, C.slate);
    ctx.fillStyle = dither(ctx, '#3d4766');
    for (let x = 30; x < 290; x += 20) ctx.fillRect(x, 14, 1, 100);
    for (let y = 20; y < 116; y += 16) ctx.fillRect(24, y, 272, 1);
    drawText(ctx, 'BOI  BAYESIAN OIL INC.', 28, 14, C.silver);
    const blink = Math.floor(this.t * 3) % 2;
    drawText(ctx, '▼ -87%', 292, 14, blink ? C.red : C.orange, { align: 'right' });
    // a jagged line falling over time
    const pts = [];
    for (let i = 0; i <= 26; i++) {
      const x = 30 + i * 10;
      const drop = Math.pow(i / 26, 1.6) * 74;
      const jag = Math.sin(i * 2.7) * 6 + Math.sin(i * 7.1) * 3;
      pts.push([x, 30 + drop + jag]);
    }
    const shown = Math.min(pts.length - 1, Math.floor(this.pt * 14));
    for (let i = 0; i < shown; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      line(ctx, x0, y0, x1, y1, C.red);
      line(ctx, x0, y0 + 1, x1, y1 + 1, C.red);
    }
    const tick = 'SELL! SELL! SELL!   PANIC IN THE DESERT   OIL WELLS DRY   ';
    const off = Math.floor(this.t * 30) % 330;
    drawText(ctx, tick + tick, 320 - off, 116 - 0, C.yellow);
  }

  drawBoard(ctx) {
    const t = this.t;
    rect(ctx, 0, 0, 320, 180, '#7b4a5c');
    ctx.fillStyle = dither(ctx, '#6a3d4f');
    ctx.fillRect(0, 0, 320, 180);
    // window with a sad chart
    panel(ctx, 230, 14, 70, 44, C.skyLow, C.ink);
    line(ctx, 236, 22, 296, 50, C.red);
    // portrait frame
    panel(ctx, 24, 14, 34, 40, C.yellow, C.ink);
    drawPumpjack(ctx, 41, 50, t, 1);
    // table
    rect(ctx, 30, 100, 260, 6, C.ink);
    rect(ctx, 31, 101, 258, 4, '#8a5a2b');
    rect(ctx, 40, 106, 4, 20, C.ink);
    rect(ctx, 276, 106, 4, 20, C.ink);
    // investors
    for (let i = 0; i < 3; i++) {
      const x = 60 + i * 50;
      const hop = Math.abs(Math.sin(t * 7 + i * 1.7)) * 4;
      drawSprite(ctx, SPR.investorAngry, x, 86 - hop);
      if (Math.floor(t * 5 + i) % 2) drawText(ctx, '!!', x + 12, 76 - hop, C.red, { shadow: C.ink });
    }
    const shout = INVESTOR_SHOUTS[Math.floor(t * 0.8) % INVESTOR_SHOUTS.length];
    const sw = shout.length * 6 + 6;
    speechBubble(ctx, 110 - sw / 2, 50, sw, 14, 112, 70);
    drawText(ctx, shout, 110, 54, C.red, { align: 'center' });
    // the CEO, sweating
    drawSprite(ctx, SPR.ceoA, 246, 84, { flip: true });
    const drop = (t * 20) % 12;
    rect(ctx, 244, 84 + drop, 1, 2, C.cyan);
    rect(ctx, 259, 88 + ((drop + 6) % 12), 1, 2, C.cyan);
  }

  drawPermit(ctx) {
    drawDesert(ctx, 300, this.t);
    rect(ctx, 0, 0, 320, 180, 'rgba(26,28,44,0.35)');
    const x = 70;
    const y = 44;
    panel(ctx, x, y, 180, 110, '#fdf3dc', C.ink, 'rgba(26,28,44,0.5)');
    drawText(ctx, 'OFFICIAL DRILLING PERMIT', x + 90, y + 6, C.navy, { align: 'center' });
    rect(ctx, x + 10, y + 16, 160, 1, C.silver);
    drawText(ctx, 'Plot: 1000 m desert strip', x + 10, y + 22, C.ink);
    drawText(ctx, 'Drilling permits: *12*', x + 10, y + 34, C.ink, { hi: C.red });
    drawText(ctx, 'Oil rigs allowed: *1*', x + 10, y + 46, C.ink, { hi: C.red });
    // tiny strip map
    rect(ctx, x + 10, y + 62, 160, 14, C.sand);
    rect(ctx, x + 10, y + 62, 160, 1, C.ink);
    rect(ctx, x + 10, y + 75, 160, 1, C.ink);
    for (let i = 0; i <= 10; i++) rect(ctx, x + 10 + i * 16, y + 76, 1, 2, C.ink);
    drawText(ctx, '0 m', x + 10, y + 80, C.slate);
    drawText(ctx, '1000 m', x + 170, y + 80, C.slate, { align: 'right' });
    drawText(ctx, '?', x + 90, y + 65, C.brown, { align: 'center' });
    if (this.pt > 0.5) {
      const grow = Math.max(0, Math.round((1 - (this.pt - 0.5) * 6) * 4));
      panel(ctx, x + 60 - grow, y + 88 - grow, 60 + grow * 2, 14 + grow * 2, '#fdf3dc', C.red);
      drawText(ctx, 'APPROVED', x + 90, y + 92, C.red, { align: 'center' });
    }
  }
}
