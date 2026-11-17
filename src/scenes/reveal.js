// The big reveal: geological cross-section, true oil curve vs. the GP,
// then the investors' verdict.
import { Scene } from '../game/scene.js';
import { game } from '../game/game.js';
import { sfx } from '../engine/sfx.js';
import { drawText } from '../engine/font.js';
import { REVEAL } from '../game/dialogue.js';
import { analyze, newGame } from '../game/state.js';
import { toBbl, randomBaseline } from '../bo/field.js';
import { mulberry32 } from '../bo/rng.js';
import { C } from '../art/palette.js';
import { rect, panel, drawDerrick, drawPumpjack, dither } from '../art/draw.js';
import { drawDesert, GROUND_Y } from '../art/scenery.js';
import { SPR, drawSprite } from '../art/sprites.js';
import { Chart } from '../ui/chart.js';
import { Menu } from '../ui/menu.js';
import { TitleScene } from './title.js';
import { BackstoryScene } from './backstory.js';
import { LabScene } from './lab.js';

const CX = 30;
const CW = 282;
const SURFACE = 97;

export class RevealScene extends Scene {
  enter() {
    const s = (this.s = game.state);
    const f = s.field;
    this.an = analyze(s);
    this.rigY = f.f(s.rigX);
    this.pct = this.rigY / f.maxY;
    this.baseline = randomBaseline(f, s.permits, 400, s.seed);
    this.stars = this.pct >= 0.95 ? 3 : this.pct >= 0.8 ? 2 : this.pct >= 0.5 ? 1 : 0;
    this.chart = new Chart({ x: CX, y: 18, w: CW, h: 62 }, Math.max(1.3, f.maxY * 1.12));
    this.section = buildSection(f);
    this.page = 'reveal';
    this.script();
  }

  async script() {
    const s = this.s;
    const f = s.field;
    this.revealT = 0;
    sfx.drill();
    await this.until(() => this.revealT >= 3.2);
    sfx.fanfare();
    const lines = ['There it is: the *true oil curve*, in yellow! Below it are the real reservoirs, oil trapped under arches of rock.'];
    const maxM = Math.round(f.maxX * 1000);
    if (Math.abs(s.rigX - f.maxX) < 0.025) {
      lines.push('And our rig sits right on top of the biggest one. Textbook Bayesian optimisation!');
    } else if (this.pct >= 0.6) {
      lines.push(`The richest spot was at ${maxM} m. We got close, but every barrel counts!`);
    } else {
      lines.push(`The big reservoir was hiding at ${maxM} m! A wide uncertainty band there meant it was worth exploring.`);
    }
    lines.push('Compare the white GP mean with the truth: accurate near our wells, rough guesswork far from them.');
    await this.say(lines, { portrait: 'prof' });
    this.page = 'results';
    this.resultsT = 0;
    if (this.stars >= 2) sfx.fanfare();
    else if (this.stars === 0) sfx.sad();
    else sfx.jingle();
    await this.wait(0.8);
    const c = await this.ask(new Menu(['New field', 'Replay story', 'Title screen'], { x: 216, y: 128, w: 98 }));
    if (c === 0) {
      game.state = newGame('free');
      game.go(new LabScene('free'));
    } else if (c === 1) {
      game.state = newGame('story');
      game.go(new BackstoryScene());
    } else game.go(new TitleScene());
  }

  update(dt) {
    this.baseUpdate(dt);
    this.revealT = (this.revealT ?? 0) + dt;
    if (this.resultsT !== undefined) this.resultsT += dt;
  }

  draw(ctx) {
    if (this.page === 'reveal') this.drawReveal(ctx);
    else this.drawResults(ctx);
    this.drawOverlay(ctx);
  }

  drawReveal(ctx) {
    const s = this.s;
    const f = s.field;
    const rt = this.revealT;
    rect(ctx, 0, 0, 320, 180, C.bp);
    ctx.fillStyle = dither(ctx, C.bpLine);
    ctx.fillRect(0, 0, 320, SURFACE);
    drawText(ctx, 'THE TRUTH REVEALED', 160, 3, C.yellow, { align: 'center', shadow: C.ink });

    // cross-section, peeled from the top
    const depth = Math.min(83, Math.floor(rt * 60));
    ctx.drawImage(this.section, 0, 0, 320, depth, 0, SURFACE, 320, depth);
    if (depth < 83) {
      rect(ctx, 0, SURFACE + depth, 320, 83 - depth, C.sandDark);
      ctx.fillStyle = dither(ctx, C.sandDeep);
      ctx.fillRect(0, SURFACE + depth, 320, 2);
    }
    rect(ctx, 0, SURFACE, 320, 1, C.ink);

    // wells and rig on the surface
    for (const d of s.drills) {
      const x = Math.round(this.chart.px(d.x));
      drawDerrick(ctx, x, SURFACE, 7, C.dusk, C.orange);
    }
    const rx = Math.round(this.chart.px(s.rigX));
    drawDerrick(ctx, rx, SURFACE, 13, C.red, C.yellow);

    // chart
    const ch = this.chart;
    ch.frame(ctx, { xLabel: '' });
    ch.band(ctx, this.an.mu, this.an.sd, 2, C.cyan);
    ch.curve(ctx, this.an.mu, C.white);
    if (rt > 1.2) {
      const frac = Math.min(1, (rt - 1.2) / 1.6);
      ctx.save();
      ctx.beginPath();
      ctx.rect(CX - 2, 0, CW * frac + 2, SURFACE);
      ctx.clip();
      ch.fn(ctx, f.f, C.yellow, { thick: true });
      ctx.restore();
    }
    ch.points(ctx, s.drills);
    // true max and rig markers
    if (rt > 2.8) {
      ch.vline(ctx, f.maxX, C.yellow);
      drawText(ctx, `max ${toBbl(f.maxY)}`, ch.px(f.maxX), ch.py(f.maxY) - 10, C.yellow, { align: 'center', shadow: C.ink });
    }
    ch.vline(ctx, s.rigX, C.red);
    drawText(ctx, 'truth', 312, 3, C.yellow, { align: 'right' });
    drawText(ctx, 'GP', 276, 3, C.white, { align: 'right' });
  }

  drawResults(ctx) {
    const s = this.s;
    const t = this.t;
    drawDesert(ctx, 200, t);
    drawDerrick(ctx, 168, GROUND_Y, 44, C.red, C.yellow);
    drawPumpjack(ctx, 200, GROUND_Y + 2, t, 1.2);

    // investors
    for (let i = 0; i < 4; i++) {
      const x = 20 + i * 26;
      const y = GROUND_Y - 15;
      if (this.stars >= 2) {
        const hop = Math.abs(Math.sin(t * 8 + i)) * 8;
        drawSprite(ctx, SPR.investorHappy, x, y - hop);
        if (Math.floor(t * 4 + i) % 3 === 0) drawText(ctx, i % 2 ? '$' : '♥', x + 3, y - 12 - hop, C.green, { shadow: C.ink });
      } else if (this.stars === 1) {
        drawSprite(ctx, SPR.investorHappy, x, y - (Math.floor(t * 2 + i) % 2));
      } else {
        ctx.save();
        ctx.translate(x + 7, GROUND_Y);
        ctx.rotate(-Math.PI / 2);
        drawSprite(ctx, SPR.investorAngry, 0, -11);
        ctx.restore();
        if (Math.floor(t * 2 + i) % 2) drawText(ctx, 'z', x + 10, GROUND_Y - 14 - i, C.white, { shadow: C.ink });
      }
    }
    drawSprite(ctx, SPR.ceoA, 128, GROUND_Y - 16);

    // results card
    const px = 40;
    const py = 8;
    panel(ctx, px, py, 240, 100, '#fdf3dc', C.ink, 'rgba(26,28,44,0.4)');
    drawText(ctx, 'QUARTERLY REPORT', 160, py + 5, C.navy, { align: 'center' });
    rect(ctx, px + 8, py + 15, 224, 1, C.silver);
    const rows = [
      ['Your rig', `${toBbl(this.rigY)} bbl/d`],
      ['Best possible spot', `${toBbl(s.field.maxY)} bbl/d`],
      ['Your score', `${Math.round(this.pct * 100)}%`],
      ['Random drilling (avg)', `${Math.round(this.baseline * 100)}%`],
      ['Wells drilled', `${s.drills.length}`],
    ];
    rows.forEach(([k, v], i) => {
      const yy = py + 20 + i * 10;
      drawText(ctx, k, px + 10, yy, C.ink);
      drawText(ctx, v, px + 230, yy, i === 2 ? C.red : C.ink, { align: 'right' });
    });
    for (let i = 0; i < 3; i++) {
      const on = i < this.stars;
      const pop = this.resultsT > 0.4 + i * 0.3;
      const sx = 132 + i * 20;
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) drawText(ctx, '★', sx + ox, py + 72 + oy, C.ink, { scale: 2 });
      drawText(ctx, '★', sx, py + 72, on && pop ? C.yellow : C.silver, { scale: 2 });
    }
    const head = [REVEAL.stars0, REVEAL.stars1, REVEAL.stars2, REVEAL.stars3][this.stars];
    drawText(ctx, head, 160, py + 89, C.plum, { align: 'center' });
    drawText(ctx, `field #${s.seed}`, 4, 171, C.brown);
  }
}

// Pre-renders the geological cross-section under the strip.
function buildSection(f) {
  const H = 83;
  const c = document.createElement('canvas');
  c.width = 320;
  c.height = H;
  const x = c.getContext('2d');
  const rng = mulberry32(f.seed + 5);
  const layers = [
    { d: 0, k: 0, col: '#e0b56f' },
    { d: 9, k: 4, col: '#c48a4a' },
    { d: 18, k: 9, col: '#6e5a5a' }, // cap rock
    { d: 26, k: 12, col: '#d4a868' }, // reservoir sandstone
    { d: 46, k: 12, col: '#8f4a32' },
    { d: 62, k: 9, col: '#6b3a26' },
    { d: 74, k: 6, col: '#4a2a22' },
  ];
  const arch = (u) => {
    let v = 0;
    for (const b of f.bumps) {
      const z = (u - b.c) / (b.w * 1.8);
      v += b.a * Math.exp(-0.5 * z * z);
    }
    return v;
  };
  const oil = (u) => {
    let v = 0;
    for (const b of f.bumps) {
      const z = (u - b.c) / b.w;
      v += b.a * Math.exp(-0.5 * z * z);
    }
    return v;
  };
  for (let col = 0; col < 320; col++) {
    const u = Math.max(0, Math.min(1, (col - CX) / (CW - 1)));
    const a = arch(u);
    const bounds = layers.map((l) => l.d - a * l.k);
    const resTop = Math.round(bounds[3]);
    const resBot = Math.round(bounds[4]);
    const oilTh = Math.min(resBot - resTop, Math.round(oil(u) * 15));
    for (let y = 0; y < H; y++) {
      let li = 0;
      for (let j = 0; j < layers.length; j++) if (y >= bounds[j]) li = j;
      let color = layers[li].col;
      if (li === 3 && y >= resTop && y < resTop + oilTh) color = (col + y) % 7 === 0 ? C.oilShine : C.oil;
      x.fillStyle = color;
      x.fillRect(col, y, 1, 1);
      if (rng() < 0.05 && color !== C.oil) {
        x.fillStyle = 'rgba(26,28,44,0.25)';
        x.fillRect(col, y, 1, 1);
      }
    }
    // layer outlines
    for (let j = 1; j < layers.length; j++) {
      x.fillStyle = 'rgba(26,28,44,0.35)';
      x.fillRect(col, Math.round(bounds[j]), 1, 1);
    }
  }
  return c;
}
