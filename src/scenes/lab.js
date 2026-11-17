// Prof. Bayes' lab: the blueprint where GPs, priors and acquisition
// functions are explained and chosen.
import { Scene } from '../game/scene.js';
import { game } from '../game/game.js';
import { drawText } from '../engine/font.js';
import { sfx } from '../engine/sfx.js';
import { LAB } from '../game/dialogue.js';
import { ELL_OPTIONS, SF_OPTIONS, analyze, evidence, priorOf } from '../game/state.js';
import { ACQ_OPTIONS } from '../bo/acquisition.js';
import { PriorSampler } from '../bo/gp.js';
import { mulberry32 } from '../bo/rng.js';
import { C } from '../art/palette.js';
import { rect, panel, line } from '../art/draw.js';
import { Chart, drawAcquisition } from '../ui/chart.js';
import { Menu } from '../ui/menu.js';
import { Dialog } from '../ui/dialogBox.js';
import { FieldScene } from './field.js';

const SAMPLE_N = 96;
const SAMPLE_XS = Float64Array.from({ length: SAMPLE_N }, (_, i) => i / (SAMPLE_N - 1));
const SAMPLE_COLORS = ['#ffcd75', '#a7f070', '#f4a6b8'];
const samplers = new Map();

function sampler(ell, sf) {
  const key = `${ell}|${sf}`;
  if (!samplers.has(key)) samplers.set(key, new PriorSampler(ell, sf, SAMPLE_XS, 3, mulberry32(7)));
  return samplers.get(key);
}

let paper = null;
function paperCanvas() {
  if (paper) return paper;
  paper = document.createElement('canvas');
  paper.width = 320;
  paper.height = 180;
  const x = paper.getContext('2d');
  rect(x, 0, 0, 320, 180, C.bp);
  for (let i = 0; i < 320; i += 8) rect(x, i, 0, 1, 180, C.bpLine);
  for (let j = 0; j < 180; j += 8) rect(x, 0, j, 320, 1, C.bpLine);
  for (let i = 0; i < 320; i += 32) rect(x, i, 0, 1, 180, '#3a62b4');
  for (let j = 0; j < 180; j += 32) rect(x, 0, j, 320, 1, '#3a62b4');
  return paper;
}

export class LabScene extends Scene {
  constructor(mode) {
    super();
    this.mode = mode; // 'tutorial' | 'revisit' | 'free'
  }

  enter() {
    this.s = game.state;
    this.v = { data: true, samples: null, post: null, acq: false, loop: false, narrow: false };
    this.info = null;
    this.an = analyze(this.s);
    this.lastDrill = -1;
    if (this.mode === 'tutorial') this.tutorial();
    else if (this.mode === 'revisit') this.revisit();
    else this.free();
  }

  sayProf(pages) {
    this.info = null;
    return this.say(pages, { portrait: 'prof' });
  }

  setInfo(text) {
    this.info = new Dialog(text, { portrait: 'prof', still: true });
  }

  // ---------- scripts ----------

  async tutorial() {
    const s = this.s;
    await this.wait(0.3);
    this.lastDrill = s.drills.length - 1;
    await this.sayProf(LAB.intro);
    this.lastDrill = -1;
    this.v.samples = { ell: 1, sf: 1 };
    await this.sayProf(LAB.gp);
    await this.sayProf(LAB.kernel);
    await this.sayProf(LAB.pickEll);
    s.ell = await this.pickEll();
    await this.sayProf(LAB.ellNote);
    await this.sayProf(LAB.pickSf);
    const ev = evidence(s, 'sf');
    s.sf = await this.pickSf();
    if (ev && ev.indexOf(Math.max(...ev)) !== 1) {
      await this.sayProf(s.sf === 0 ? [LAB.sfNote, LAB.sfNoteLittle] : [LAB.sfNote]);
    }
    this.v.samples = { ell: s.ell, sf: s.sf };
    this.an = analyze(s);
    await this.sayProf(LAB.condition);
    await this.condition();
    await this.sayProf(LAB.posterior);
    await this.sayProf(LAB.acqIntro);
    s.acq = await this.pickAcq();
    await this.sayProf(ACQ_OPTIONS[s.acq].foil ? LAB.foil : LAB.goodPick);
    this.v.loop = true;
    await this.sayProf(LAB.loop);
    this.toField();
  }

  async free() {
    const s = this.s;
    await this.wait(0.3);
    this.v.samples = { ell: s.ell, sf: s.sf };
    await this.sayProf(LAB.free);
    s.ell = await this.pickEll();
    s.sf = await this.pickSf();
    this.v.samples = null;
    this.v.post = 1;
    this.v.acq = true;
    this.an = analyze(s);
    s.acq = await this.pickAcq();
    this.toField();
  }

  async revisit() {
    const s = this.s;
    this.v.post = 1;
    this.v.acq = true;
    for (;;) {
      this.an = analyze(s);
      this.v.narrow = true;
      this.setInfo(LAB.revisit);
      const c = await this.ask(
        new Menu(['Back to field', 'Change prior', 'Change acquis.'], { x: 208, y: 14, w: 108, title: 'LAB', cancel: true }),
      );
      if (c <= 0) break;
      if (c === 1) {
        s.ell = await this.pickEll();
        s.sf = await this.pickSf();
      } else {
        s.acq = await this.pickAcq();
      }
    }
    this.toField();
  }

  toField() {
    this.info = null;
    game.go(new FieldScene('bo'));
  }

  async condition() {
    const start = this.t;
    this.v.post = 0;
    sfx.jingle();
    await this.until(() => {
      this.v.post = Math.min(1, (this.t - start) / 1.6);
      return this.v.post >= 1;
    });
    this.v.samples = null;
  }

  // ---------- choices ----------

  evidenceItems(opts, which) {
    const ev = evidence(this.s, which);
    return opts.map((o, i) => ({
      label: o.label,
      tag: o.tag,
      bar: ev ? ev[i] : 0,
      barLabel: ev ? `${Math.round(ev[i] * 100)}%` : 'n/a',
    }));
  }

  async pickEll() {
    const s = this.s;
    const showPost = this.v.post === 1;
    this.v.narrow = true;
    const menu = new Menu(this.evidenceItems(ELL_OPTIONS, 'ell'), {
      x: 208,
      y: 14,
      w: 108,
      title: 'LENGTH-SCALE ℓ',
      start: s.ell,
      onHover: (i) => {
        this.setInfo(ELL_OPTIONS[i].report);
        if (showPost) this.an = analyze(s, { prior: priorOf(s, i, s.sf) });
        else this.v.samples = { ell: i, sf: s.sf };
      },
    });
    const c = await this.ask(menu);
    this.v.narrow = false;
    this.an = analyze(s, { prior: priorOf(s, c, s.sf) });
    return c;
  }

  async pickSf() {
    const s = this.s;
    const showPost = this.v.post === 1;
    this.v.narrow = true;
    const menu = new Menu(this.evidenceItems(SF_OPTIONS, 'sf'), {
      x: 208,
      y: 14,
      w: 108,
      title: 'AMPLITUDE σ',
      start: s.sf,
      onHover: (i) => {
        this.setInfo(SF_OPTIONS[i].report);
        if (showPost) this.an = analyze(s, { prior: priorOf(s, s.ell, i) });
        else this.v.samples = { ell: s.ell, sf: i };
      },
    });
    const c = await this.ask(menu);
    this.v.narrow = false;
    this.an = analyze(s, { prior: priorOf(s, s.ell, c) });
    return c;
  }

  async pickAcq() {
    const s = this.s;
    this.v.narrow = true;
    this.v.post = 1;
    this.v.acq = true;
    const items = ACQ_OPTIONS.map((o) => ({ label: o.label, color: o.foil ? C.slate : C.ink }));
    const menu = new Menu(items, {
      x: 208,
      y: 14,
      w: 108,
      title: 'ACQUISITION',
      start: s.acq,
      onHover: (i) => {
        this.setInfo(ACQ_OPTIONS[i].desc);
        this.an = analyze(s, { acq: i });
      },
    });
    const c = await this.ask(menu);
    this.v.narrow = false;
    this.an = analyze(s, { acq: c });
    return c;
  }

  // ---------- drawing ----------

  update(dt) {
    this.baseUpdate(dt);
  }

  draw(ctx) {
    ctx.drawImage(paperCanvas(), 0, 0);
    drawText(ctx, "PROF. BAYES' LAB", 4, 3, C.bpInk);
    if (this.v.loop) this.drawLoop(ctx);
    else this.drawChart(ctx);
    if (this.info && !this.dialog) this.info.draw(ctx);
    this.drawOverlay(ctx);
  }

  drawChart(ctx) {
    const s = this.s;
    const v = this.v;
    const w = v.narrow ? 170 : 278;
    const chart = new Chart({ x: 30, y: 16, w, h: v.acq ? 66 : 94 });
    chart.frame(ctx, { xLabel: v.acq ? '' : 'position (m)' });

    const prior = v.samples ? priorOf(s, v.samples.ell, v.samples.sf) : priorOf(s);
    const m = this.an.gp.m;

    if (v.samples && (v.post === null || v.post < 1)) {
      const sp = sampler(prior.ell, prior.sf);
      const fade = v.post === null ? 1 : 1 - v.post;
      if (fade > 0.15) {
        for (let c = 0; c < 3; c++) {
          chart.curve(ctx, sp.sample(c, this.t * 0.9 + c * 2.1, m), SAMPLE_COLORS[c]);
        }
      }
      if (v.post === null) {
        // prior mean and ±2σ guide lines
        const yy = chart.py(m);
        for (let x = chart.x; x < chart.x + chart.w; x += 4) rect(ctx, x, yy, 2, 1, C.bpInk);
        for (const k of [-2, 2]) {
          const y2 = chart.clampY(chart.py(m + k * prior.sf));
          for (let x = chart.x; x < chart.x + chart.w; x += 6) rect(ctx, x, y2, 1, 1, C.bpLine2);
        }
      }
    }

    if (v.post !== null) {
      const t = easeInOut(v.post);
      const n = this.an.mu.length;
      const sfp = this.an.gp.sf;
      const mu = new Float64Array(n);
      const sd = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        mu[i] = m + t * (this.an.mu[i] - m);
        sd[i] = sfp + t * (this.an.sd[i] - sfp);
      }
      chart.band(ctx, mu, sd, 2, C.cyan);
      chart.curve(ctx, mu, C.white, { thick: true });
    }

    if (v.data) chart.points(ctx, s.drills, { last: this.lastDrill, t: this.t });

    if (v.acq) {
      const area = { x: 30, y: 92, w, h: 22 };
      drawAcquisition(ctx, area, this.an.acq, { label: `acquisition: ${ACQ_OPTIONS[this.menuAcq() ?? s.acq].short}`, t: this.t });
      drawText(ctx, 'position (m)', 30 + w, 116, C.bpLine2, { align: 'right' });
    }

    // legend
    if (!v.narrow) {
      let lx = 308;
      const items = [];
      if (v.data && s.drills.length) items.push(['● wells', C.orange]);
      if (v.post !== null) items.push(['- mean', C.white], ['░ ±2σ', C.cyan]);
      if (v.samples && v.post === null) items.push(['~ GP samples', SAMPLE_COLORS[0]]);
      for (const [txt, col] of items.reverse()) {
        drawText(ctx, txt.replace('░', '#'), lx, 3, col, { align: 'right' });
        lx -= txt.length * 5 + 10;
      }
    }

  }

  menuAcq() {
    if (this.menu && this.menu.title === 'ACQUISITION') return this.menu.sel;
    return null;
  }

  drawLoop(ctx) {
    const boxes = [
      { x: 30, y: 22, label: '1. FIT THE GP', sub: 'mean + uncertainty' },
      { x: 180, y: 22, label: '2. MAX ACQUISITION', sub: 'find the ★' },
      { x: 180, y: 82, label: '3. DRILL THERE', sub: 'spend 1 permit' },
      { x: 30, y: 82, label: '4. ADD THE DATA', sub: 'new well → GP' },
    ];
    const active = Math.floor(this.t * 1.2) % 4;
    const bw = 110;
    const bh = 26;
    const cx = (i) => boxes[i].x + bw / 2;
    const cy = (i) => boxes[i].y + bh / 2;
    const arrow = (x0, y0, x1, y1) => {
      line(ctx, x0, y0, x1, y1, C.bpInk);
      line(ctx, x0, y0 + 1, x1, y1 + 1, C.bpInk);
    };
    arrow(boxes[0].x + bw + 2, cy(0), boxes[1].x - 4, cy(1));
    drawText(ctx, '▶', boxes[1].x - 5, cy(1) - 2, C.bpInk);
    arrow(cx(1), boxes[1].y + bh + 2, cx(2), boxes[2].y - 4);
    drawText(ctx, '▼', cx(2) - 2, boxes[2].y - 5, C.bpInk);
    arrow(boxes[2].x - 2, cy(2), boxes[3].x + bw + 4, cy(3));
    drawText(ctx, '◀', boxes[3].x + bw + 2, cy(3) - 2, C.bpInk);
    arrow(cx(3), boxes[3].y - 2, cx(0), boxes[0].y + bh + 4);
    drawText(ctx, '▼', cx(0) - 2, boxes[0].y + bh + 1, C.bpInk);
    boxes.forEach((b, i) => {
      panel(ctx, b.x, b.y, bw, bh, i === active ? C.yellow : C.bpInk, C.ink);
      drawText(ctx, b.label, b.x + bw / 2, b.y + 4, C.navy, { align: 'center' });
      drawText(ctx, b.sub, b.x + bw / 2, b.y + 14, C.slate, { align: 'center' });
    });
    drawText(ctx, 'BAYESIAN', 160, 60, C.bpInk, { align: 'center' });
    drawText(ctx, 'OPTIMISATION', 160, 70, C.bpInk, { align: 'center' });
  }
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
