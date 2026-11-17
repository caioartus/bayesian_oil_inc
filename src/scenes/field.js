// The desert: walk around, drill wells, read the radar, build the rig.
import { Scene } from '../game/scene.js';
import { game } from '../game/game.js';
import { input } from '../engine/input.js';
import { sfx } from '../engine/sfx.js';
import { drawText, wrap } from '../engine/font.js';
import { FIELD, PROF_ARRIVE, BO } from '../game/dialogue.js';
import { analyze, bestDrill, permitsLeft } from '../game/state.js';
import { toBbl } from '../bo/field.js';
import { ACQ_OPTIONS } from '../bo/acquisition.js';
import { drawDesert, GROUND_Y, WORLD_W } from '../art/scenery.js';
import {
  rect,
  panel,
  dither,
  drawDerrick,
  drawFlag,
  drawWellhead,
  drawPhone,
  drawArrow,
  drawBubbleText,
  drawStar,
  oilColor,
} from '../art/draw.js';
import { SPR, drawSprite } from '../art/sprites.js';
import { C } from '../art/palette.js';
import { Menu } from '../ui/menu.js';
import { sampleAt } from '../ui/chart.js';
import { LabScene } from './lab.js';
import { RevealScene } from './reveal.js';

const SPEED = 75;
const NEAR = 8; // px: how close to a marker counts
const PHONE = { x: 94, y: 6, w: 10, h: 14 };
const RADAR = { x: 210, y: 4, w: 106, h: 54 };

export class FieldScene extends Scene {
  constructor(phase) {
    super();
    this.phase = phase; // 'naive' | 'bo'
  }

  enter() {
    const s = (this.s = game.state);
    this.px = s.playerPx;
    this.facing = 1;
    this.walkT = 0;
    this.stepT = 0;
    this.control = false;
    this.particles = [];
    this.emitters = [];
    this.popups = [];
    this.shake = 0;
    this.thought = null;
    this.shout = null;
    this.prof = null;
    this.rigAnim = null;
    this.building = null;
    this.ringing = false;
    this.showMarkers = false;
    this.phoneHint = false;
    this.mode = this.phase;
    this.refresh();
    if (this.phase === 'naive') this.naiveIntro();
    else this.boIntro();
  }

  // Dialogs go at the top here, so they don't cover the CEO.
  say(pages, opts = {}) {
    return super.say(pages, { pos: 'top', ...opts });
  }

  refresh() {
    this.an = this.phase === 'naive' ? null : analyze(this.s);
  }

  camX() {
    return Math.max(0, Math.min(WORLD_W - 320, Math.round(this.px - 160)));
  }

  think(text) {
    this.thought = text ? wrap(text, 140) : null;
  }

  // ---------- scripts ----------

  async naiveIntro() {
    await this.wait(0.7);
    this.think(FIELD.arrive);
    await this.waitOrPress(4);
    this.think(null);
    this.showMarkers = true;
    sfx.confirm();
    this.control = true;
  }

  async boIntro() {
    const s = this.s;
    await this.wait(0.4);
    if (!s.seen.radio) {
      s.seen.radio = true;
      const pages = s.mode === 'free' ? BO.freeRadio : BO.radio;
      await this.say(pages, { portrait: 'prof', name: 'PROF. BAYES (RADIO)' });
    }
    if (permitsLeft(s) <= 0) await this.enterRigMode();
    this.control = true;
  }

  async profArrives() {
    this.control = false;
    this.phoneHint = false;
    this.ringing = true;
    sfx.ring();
    await this.wait(0.55);
    sfx.ring();
    await this.wait(0.7);
    this.ringing = false;
    const cam = this.camX();
    const fromRight = this.px + 30 < WORLD_W - 10;
    this.prof = {
      x: fromRight ? cam + 334 : cam - 14,
      target: this.px + (fromRight ? 20 : -20),
      dir: fromRight ? -1 : 1,
    };
    this.facing = fromRight ? 1 : -1;
    await this.until(() => this.prof.arrived);
    this.shout = { text: 'STOP DRILLING RANDOMLY!', t: 0 };
    sfx.shout();
    this.shake = 0.5;
    await this.waitOrPress(2.4);
    this.shout = null;
    await this.say(PROF_ARRIVE, { portrait: 'prof' });
    this.s.playerPx = this.px;
    game.go(new LabScene('tutorial'));
  }

  async drill(x) {
    const s = this.s;
    this.control = false;
    const wx = x * WORLD_W;
    const prevBest = bestDrill(s)?.y ?? 0;
    const prevArgX = this.an?.argX;
    // step aside so the rig doesn't land on the CEO
    const side = wx < 20 ? 1 : -1;
    this.px = wx + side * 16;
    this.facing = -side;
    this.rigAnim = { x: wx, t: 0, drilling: false };
    sfx.drop();
    await this.wait(0.45);
    this.rigAnim.drilling = true;
    sfx.drill();
    this.shake = 1.15;
    await this.wait(1.2);
    this.rigAnim.drilling = false;
    const y = s.field.measure(x);
    this.gush(wx, y);
    sfx.gush(Math.min(1, y));
    this.popups.push({ x: wx, y: GROUND_Y - 40, text: `${toBbl(y)} bbl/d`, t: 0, color: oilColor(y) });
    await this.wait(1.4);
    s.drills.push({ x, y });
    this.rigAnim = null;
    this.refresh();
    if (this.phase === 'naive') await this.afterNaive();
    else await this.afterBO(x, y, prevBest, prevArgX);
  }

  async afterNaive() {
    const done = this.s.markers.filter((m) => this.isDrilled(m)).length;
    if (done === 2) {
      this.think(FIELD.midway);
      this.control = true;
      await this.wait(2.5);
      if (this.thought) this.think(null);
      return;
    }
    if (done < this.s.markers.length) {
      this.control = true;
      return;
    }
    this.showMarkers = false;
    await this.wait(0.4);
    this.think(FIELD.stuck);
    await this.waitOrPress(3.5);
    this.think(FIELD.callIdea);
    await this.waitOrPress(3);
    this.think(null);
    this.phoneHint = true;
    this.control = true;
  }

  async afterBO(x, y, prevBest, prevArgX) {
    const s = this.s;
    const seen = s.seen;
    const left = permitsLeft(s);
    if (left <= 0) {
      await this.say(BO.noPermits, { portrait: 'prof', name: 'PROF. BAYES (RADIO)' });
      await this.enterRigMode();
      this.control = true;
      return;
    }
    const nearWell = s.drills.some((d) => Math.abs(d.x - this.an.argX) < 0.006);
    let msg = null;
    if (!seen.firstDrill && s.drills.length > 0) {
      seen.firstDrill = true;
      msg = s.mode === 'free' && s.drills.length === 1 ? null : BO.firstDrill;
    } else if (nearWell && !seen.converged) {
      seen.converged = true;
      msg = BO.converged;
    } else if (y > prevBest + 0.05 && s.drills.length > 1) {
      msg = BO.record;
    } else if (prevArgX !== undefined && Math.abs(x - prevArgX) > 0.04 && (seen.offStar || 0) < 2) {
      seen.offStar = (seen.offStar || 0) + 1;
      msg = BO.offStar;
    } else if (left === 1) {
      msg = BO.lastPermit;
    }
    if (msg) await this.say(msg, { portrait: 'prof', name: 'PROF. BAYES (RADIO)' });
    this.control = true;
  }

  async enterRigMode() {
    this.mode = 'rig';
    const bd = bestDrill(this.s);
    this.rigSuggest = bd ? bd.x : 0.5;
  }

  async buildRig() {
    this.control = false;
    const x = this.px / WORLD_W;
    this.s.rigX = x;
    this.building = { x: this.px, t: 0 };
    sfx.build();
    this.shake = 1.0;
    await this.wait(1.4);
    sfx.jingle();
    this.gush(this.px, 0.6);
    await this.wait(1.6);
    game.go(new RevealScene());
  }

  // ---------- input ----------

  isDrilled(x) {
    return this.s.drills.some((d) => Math.abs(d.x - x) < 0.002);
  }

  nearestMarker() {
    let best = null;
    for (const m of this.s.markers) {
      if (this.isDrilled(m)) continue;
      const d = Math.abs(m * WORLD_W - this.px);
      if (d <= NEAR && (!best || d < best.d)) best = { m, d };
    }
    return best;
  }

  onAction() {
    const s = this.s;
    if (this.mode === 'naive') {
      if (!this.showMarkers) return;
      const near = this.nearestMarker();
      if (near) {
        this.px = near.m * WORLD_W;
        this.drill(near.m);
      } else {
        sfx.bad();
        this.flashThought(FIELD.notMarker);
      }
    } else if (this.mode === 'bo') {
      const x = this.px / WORLD_W;
      if (s.drills.some((d) => Math.abs(d.x - x) < 0.006)) {
        sfx.bad();
        this.flashThought(BO.alreadyDrilled);
        return;
      }
      this.drill(x);
    } else if (this.mode === 'rig') {
      this.confirmRig();
    }
  }

  async flashThought(text) {
    this.think(text);
    const mine = this.thought;
    await this.wait(1.8);
    if (this.thought === mine) this.think(null);
  }

  async confirmRig() {
    this.control = false;
    const m = Math.round((this.px / WORLD_W) * 1000);
    const yes = await this.ask(
      new Menu(['Yes, build it!', 'Not yet'], { x: 110, y: 70, w: 100, title: `Build rig at ${m} m?` }),
    );
    if (yes === 0) this.buildRig();
    else this.control = true;
  }

  async onBack() {
    const s = this.s;
    if (this.mode === 'naive') {
      if (this.phoneHint) this.profArrives();
      return;
    }
    this.control = false;
    const items = this.mode === 'rig' ? ['Call the Professor (lab)', 'Back'] : ['Call the Professor (lab)', 'Build the rig now', 'Keep drilling'];
    const c = await this.ask(new Menu(items, { x: 90, y: 60, w: 140, title: 'MENU', cancel: true }));
    if (c === 0) {
      s.playerPx = this.px;
      sfx.ring();
      game.go(new LabScene('revisit'));
      return;
    }
    if (this.mode === 'bo' && c === 1) {
      const sure = await this.ask(
        new Menu(['Yes, stop drilling', 'No, keep drilling'], {
          x: 90,
          y: 60,
          w: 140,
          title: `Give up ${permitsLeft(s)} permits?`,
        }),
      );
      if (sure === 0) {
        s.permits = s.drills.length;
        await this.enterRigMode();
      }
    }
    this.control = true;
  }

  // ---------- effects ----------

  gush(wx, y) {
    const power = Math.max(0.05, Math.min(1.3, y));
    this.emitters.push({ x: wx, t: 0.9, rate: 40 + 120 * power, power, acc: 0, oil: true });
  }

  updateEffects(dt) {
    for (const e of this.emitters) {
      e.t -= dt;
      e.acc += e.rate * dt;
      while (e.acc >= 1) {
        e.acc -= 1;
        if (e.oil) {
          const v = 50 + 150 * e.power * (0.6 + 0.4 * Math.random());
          this.particles.push({
            x: e.x + (Math.random() - 0.5) * 2,
            y: GROUND_Y - 8,
            vx: (Math.random() - 0.5) * 30,
            vy: -v,
            life: 2,
            color: Math.random() < 0.2 ? C.oilShine : C.oil,
            size: Math.random() < 0.3 ? 2 : 1,
          });
        } else {
          this.particles.push({
            x: e.x + (Math.random() - 0.5) * 6,
            y: GROUND_Y - 1,
            vx: (Math.random() - 0.5) * 50,
            vy: -30 - Math.random() * 50,
            life: 0.8,
            color: Math.random() < 0.5 ? C.sandDark : C.sandDeep,
            size: 1,
          });
        }
      }
    }
    this.emitters = this.emitters.filter((e) => e.t > 0);
    if (this.rigAnim?.drilling) {
      if (Math.random() < 0.7) {
        this.emitters.push({ x: this.rigAnim.x, t: 0.05, rate: 60, acc: 0, oil: false });
      }
    }
    for (const p of this.particles) {
      p.vy += 220 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.y > GROUND_Y + 1) {
        p.y = GROUND_Y + 1;
        p.vy = 0;
        p.vx *= 0.5;
        p.life = Math.min(p.life, 0.3);
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.popups) p.t += dt;
    this.popups = this.popups.filter((p) => p.t < 2.6);
  }

  update(dt) {
    this.baseUpdate(dt);
    this.updateEffects(dt);
    this.shake = Math.max(0, this.shake - dt);
    if (this.rigAnim) this.rigAnim.t += dt;
    if (this.building) this.building.t += dt;
    if (this.shout) this.shout.t += dt;
    if (this.prof && !this.prof.arrived) {
      this.prof.x += this.prof.dir * 110 * dt;
      this.prof.walk = (this.prof.walk || 0) + dt;
      if ((this.prof.dir < 0 && this.prof.x <= this.prof.target) || (this.prof.dir > 0 && this.prof.x >= this.prof.target)) {
        this.prof.x = this.prof.target;
        this.prof.arrived = true;
      }
    }
    if (!this.control || this.busy()) return;

    const dir = (input.down('right') ? 1 : 0) - (input.down('left') ? 1 : 0);
    if (dir) {
      this.facing = dir;
      this.px = Math.max(6, Math.min(WORLD_W - 6, this.px + dir * SPEED * dt));
      this.walkT += dt;
      this.stepT += dt;
      if (this.stepT > 0.22) {
        this.stepT = 0;
        sfx.step();
      }
    } else this.walkT = 0;

    const c = input.click;
    if (c && c.x >= PHONE.x - 2 && c.x <= PHONE.x + PHONE.w + 2 && c.y <= PHONE.y + PHONE.h + 2) {
      input.consume('a');
      this.onBack();
      return;
    }
    if (input.pressed('a')) this.onAction();
    else if (input.pressed('b')) this.onBack();
  }

  // ---------- drawing ----------

  draw(ctx) {
    const t = this.t;
    const cam = this.camX();
    const sx = this.shake > 0 ? Math.round((Math.random() - 0.5) * 3) : 0;
    const sy = this.shake > 0 ? Math.round((Math.random() - 0.5) * 2) : 0;
    ctx.save();
    ctx.translate(sx, sy);
    drawDesert(ctx, cam, t);
    ctx.translate(-cam, 0);
    this.drawWorld(ctx, cam, t);
    ctx.restore();
    this.drawHUD(ctx, cam, t);
    this.drawOverlay(ctx);
  }

  drawWorld(ctx, cam, t) {
    const s = this.s;
    // tutorial markers
    if (this.mode === 'naive' && this.showMarkers) {
      for (const m of s.markers) {
        if (this.isDrilled(m)) continue;
        const mx = Math.round(m * WORLD_W);
        rect(ctx, mx - 3, GROUND_Y - 1, 7, 1, C.red);
        rect(ctx, mx, GROUND_Y - 3, 1, 5, C.red);
        drawArrow(ctx, mx, GROUND_Y - 30, t);
      }
    }
    // wells
    const best = bestDrill(s);
    for (const d of s.drills) {
      const wx = Math.round(d.x * WORLD_W);
      const pw = Math.round(4 + 16 * Math.max(0, Math.min(1.2, d.y)));
      rect(ctx, wx - pw / 2, GROUND_Y, pw, 2, C.oil);
      rect(ctx, wx - pw / 2 + 1, GROUND_Y, Math.max(1, pw / 3), 1, C.oilShine);
      drawWellhead(ctx, wx, GROUND_Y);
      drawFlag(ctx, wx + 4, GROUND_Y, oilColor(d.y), t);
      const near = Math.abs(wx - this.px) < 60 || d === best;
      if (near) {
        const label = String(toBbl(d.y));
        const w = label.length * 6 + 4;
        panel(ctx, wx + 4 - w / 2 + 3, GROUND_Y - 25, w, 11, d === best ? C.yellow : C.white, C.ink);
        drawText(ctx, label, wx + 7, GROUND_Y - 23, C.ink, { align: 'center' });
      }
    }
    // rig suggestion ghost
    if (this.mode === 'rig' && !this.building) {
      const gx = Math.round(this.rigSuggest * WORLD_W);
      if (Math.floor(t * 2) % 2 === 0) drawDerrick(ctx, gx, GROUND_Y, 30, C.slate, C.yellow);
      drawArrow(ctx, gx, GROUND_Y - 46, t);
    }
    // drilling rig dropping in
    if (this.rigAnim) {
      const a = this.rigAnim;
      let off = Math.min(0, -70 + a.t * 260);
      if (a.t > 0.27 && a.t < 0.45) off = -Math.sin(((a.t - 0.27) / 0.18) * Math.PI) * 4;
      const jig = a.drilling ? Math.round(Math.sin(t * 60)) : 0;
      drawDerrick(ctx, a.x + jig, GROUND_Y + off, 26, C.dusk, C.orange);
      if (a.drilling) {
        const bit = Math.floor(t * 20) % 2;
        rect(ctx, a.x - 1, GROUND_Y - 4, 3, 4 + bit, C.silver);
      }
    }
    // final rig being built
    if (this.building) {
      const h = Math.min(44, this.building.t * 40);
      drawDerrick(ctx, this.building.x, GROUND_Y, Math.max(6, h), C.red, C.yellow);
    }
    // professor
    if (this.prof) {
      const moving = !this.prof.arrived;
      const f = moving && Math.floor(this.prof.walk * 8) % 2 ? SPR.profB : SPR.profA;
      const hop = moving ? Math.abs(Math.sin(this.prof.walk * 16)) * 2 : 0;
      drawSprite(ctx, f, this.prof.x - 6, GROUND_Y - 16 - hop, { flip: this.prof.dir > 0 });
    }
    // player
    const walking = this.walkT > 0;
    const frame = walking && Math.floor(this.walkT * 8) % 2 ? SPR.ceoB : SPR.ceoA;
    const bob = walking ? Math.floor(this.walkT * 8) % 2 : 0;
    const flip = this.facing < 0;
    const pxr = Math.round(this.px);
    drawSprite(ctx, frame, pxr - 6, GROUND_Y - 16 - bob, { flip });
    // briefcase
    const bx = flip ? pxr - 9 : pxr + 4;
    rect(ctx, bx, GROUND_Y - 5 - bob, 5, 4, C.ink);
    rect(ctx, bx + 1, GROUND_Y - 4 - bob, 3, 2, '#8a5a2b');
    if (this.ringing) drawText(ctx, 'RING!', pxr, GROUND_Y - 30 + Math.round(Math.sin(t * 30)), C.red, { align: 'center', shadow: C.white });

    // particles
    for (const p of this.particles) rect(ctx, p.x, p.y, p.size, p.size, p.color);
    // popups
    for (const p of this.popups) {
      const yy = p.y - p.t * 10;
      if (p.t > 2.2 && Math.floor(p.t * 10) % 2) continue;
      drawText(ctx, p.text, p.x, yy, p.color, { align: 'center', shadow: C.ink, scale: 1 });
    }
  }

  drawHUD(ctx, cam, t) {
    const s = this.s;
    // permits panel
    panel(ctx, 4, 4, 86, 26, C.white, C.ink, 'rgba(26,28,44,0.3)');
    drawText(ctx, 'PERMITS', 8, 7, C.navy);
    for (let i = 0; i < s.permits; i++) {
      const used = i < s.drills.length;
      rect(ctx, 48 + (i % 12) * 3, 8, 2, 5, used ? C.silver : C.orange);
    }
    const bd = bestDrill(s);
    drawText(ctx, `BEST ${bd ? toBbl(bd.y) : '---'} bbl/d`, 8, 18, C.ink);

    if (this.mode !== 'naive' || this.phoneHint) {
      const ring = this.phoneHint && Math.floor(t * 3) % 2 === 0;
      drawPhone(ctx, PHONE.x, PHONE.y, this.phoneHint, t);
      drawText(ctx, 'B', PHONE.x + 12, PHONE.y + 3, ring ? C.red : C.white, { shadow: C.ink });
    }
    if (this.mode === 'bo' || this.mode === 'rig') this.drawRadar(ctx, cam, t);

    // screen-space thought & shout
    if (this.thought) {
      const sxp = Math.round(this.px) - cam;
      drawBubbleText(ctx, this.thought, sxp + 10, GROUND_Y - 26, sxp + 2, GROUND_Y - 18, 'thought');
    }
    if (this.shout) {
      const j = Math.round(Math.sin(this.shout.t * 50) * 1.5);
      drawText(ctx, this.shout.text, 160 + j, 44, C.red, { align: 'center', scale: 2, shadow: C.ink });
    }

    // hint line
    if (this.control && !this.busy() && !this.thought) {
      const hint = this.hintText();
      if (hint) {
        rect(ctx, 0, 165, 320, 12, 'rgba(26,28,44,0.55)');
        drawText(ctx, hint, 160, 167, C.white, { align: 'center', hi: C.yellow });
      }
    }
  }

  hintText() {
    const s = this.s;
    if (this.mode === 'naive') {
      if (this.phoneHint) return Math.floor(this.t * 2) % 2 ? FIELD.hintCall : '';
      if (!this.showMarkers) return '';
      return this.nearestMarker() ? 'Press *SPACE* to drill here!' : FIELD.hintMarkers;
    }
    if (this.mode === 'rig') {
      const d = Math.round((this.rigSuggest * WORLD_W - this.px) / WORLD_W * 1000);
      if (Math.abs(d) <= 4) return 'Best well right here. *SPACE*: build the rig';
      return `${BO.rigHint}   (best well ${d > 0 ? '→' : '←'} ${Math.abs(d)} m)`;
    }
    if (permitsLeft(s) <= 0) return '';
    const a = this.an.acq;
    if (a.flat) return 'Radar is flat: drill anywhere with *SPACE*';
    const d = Math.round(((this.an.argX * WORLD_W - this.px) / WORLD_W) * 1000);
    if (Math.abs(d) <= 3) return "You're on the *★*! Press *SPACE* to drill";
    return `*★* is ${Math.abs(d)} m ${d > 0 ? '→' : '←'}    SPACE drill   B menu`;
  }

  drawRadar(ctx, cam, t) {
    const s = this.s;
    const { x, y, w, h } = RADAR;
    panel(ctx, x, y, w, h, '#0e2a22', C.ink, 'rgba(26,28,44,0.3)');
    const ix = x + 3;
    const iy = y + 11;
    const iw = w - 6;
    const ih = h - 18;
    ctx.fillStyle = dither(ctx, '#123a2e');
    for (let gx = 0; gx <= 4; gx++) ctx.fillRect(ix + Math.round((gx / 4) * (iw - 1)), iy, 1, ih);
    rect(ctx, ix, iy + ih, iw, 1, '#2c6b52');

    const rig = this.mode === 'rig';
    const opt = ACQ_OPTIONS[s.acq];
    drawText(ctx, rig ? 'RADAR: GP MEAN' : `RADAR: ${opt.short}`, x + 4, y + 2, C.lime);

    let vals;
    let lo;
    let hi;
    let arg;
    if (rig) {
      vals = this.an.mu;
      lo = 0;
      hi = Math.max(...vals) || 1;
      arg = Math.floor(this.rigSuggest * vals.length);
    } else {
      vals = this.an.acq.a;
      lo = this.an.acq.lo;
      hi = this.an.acq.hi;
      arg = this.an.acq.arg;
    }
    const flat = !rig && this.an.acq.flat;
    const span = hi - lo || 1;
    const tops = [];
    for (let c = 0; c < iw; c++) {
      const v = flat ? 0.4 : (sampleAt(vals, (c + 0.5) / iw) - lo) / span;
      tops.push(Math.round(iy + ih - 1 - Math.max(0, Math.min(1, v)) * (ih - 2)));
    }
    ctx.fillStyle = dither(ctx, C.green);
    tops.forEach((tp, c) => ctx.fillRect(ix + c, tp, 1, iy + ih - tp));
    ctx.fillStyle = C.lime;
    tops.forEach((tp, c) => {
      const p = c ? tops[c - 1] : tp;
      ctx.fillRect(ix + c, Math.min(p, tp), 1, Math.abs(p - tp) + 1);
    });
    // wells
    for (const d of s.drills) rect(ctx, ix + Math.round(d.x * (iw - 1)), iy + ih + 1, 1, 2, C.orange);
    // camera view bracket
    const v0 = ix + Math.round((cam / WORLD_W) * (iw - 1));
    const v1 = ix + Math.round(((cam + 320) / WORLD_W) * (iw - 1));
    rect(ctx, v0, iy + ih + 4, v1 - v0, 1, '#2c6b52');
    // target star
    if (!flat) {
      const ax = ix + Math.round(((arg + 0.5) / vals.length) * (iw - 1));
      if (Math.floor(t * 3) % 2 === 0) drawStar(ctx, ax, iy + 3);
      for (let yy = iy + 7; yy < iy + ih; yy += 2) rect(ctx, ax, yy, 1, 1, C.yellow);
    }
    // player
    const pxr = ix + Math.round((this.px / WORLD_W) * (iw - 1));
    rect(ctx, pxr, iy, 1, ih + 4, C.white);
    rect(ctx, pxr - 1, iy + ih + 1, 3, 2, C.white);
  }
}
