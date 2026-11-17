// Base scene with a tiny coroutine helper, so tutorial beats can be written
// as plain async scripts:  await this.say([...]); await this.wait(1);
import { input } from '../engine/input.js';
import { Dialog } from '../ui/dialogBox.js';

export class Scene {
  constructor() {
    this.t = 0;
    this.dialog = null;
    this.menu = null;
    this.waiters = [];
  }

  say(pages, opts = {}) {
    return new Promise((resolve) => {
      this.dialog = new Dialog(pages, {
        ...opts,
        onDone: () => {
          this.dialog = null;
          resolve();
        },
      });
    });
  }

  ask(menu) {
    return new Promise((resolve) => {
      this.menu = menu;
      menu.onChoose = (i) => {
        this.menu = null;
        resolve(i);
      };
    });
  }

  wait(sec) {
    return new Promise((resolve) => this.waiters.push({ at: this.t + sec, resolve }));
  }

  until(pred) {
    return new Promise((resolve) => this.waiters.push({ pred, resolve }));
  }

  // Wait `sec` seconds, or less if the player presses A.
  waitOrPress(sec) {
    const at = this.t + sec;
    return this.until(() => this.t >= at || this._pressedA);
  }

  busy() {
    return !!(this.dialog || this.menu);
  }

  baseUpdate(dt) {
    this.t += dt;
    if (this.dialog) this.dialog.update(dt);
    else if (this.menu) this.menu.update(dt);
    this._pressedA = input.anyPressed();
    const keep = [];
    for (const w of this.waiters) {
      if ((w.at !== undefined && this.t >= w.at) || (w.pred && w.pred())) w.resolve();
      else keep.push(w);
    }
    this.waiters = keep;
  }

  drawOverlay(ctx) {
    if (this.menu) this.menu.draw(ctx);
    if (this.dialog) this.dialog.draw(ctx);
  }
}
