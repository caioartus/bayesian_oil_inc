import { Scene } from '../game/scene.js';
import { game } from '../game/game.js';
import { newGame } from '../game/state.js';
import { drawDesert, GROUND_Y } from '../art/scenery.js';
import { drawPumpjack, drawDerrick } from '../art/draw.js';
import { SPR, drawSprite } from '../art/sprites.js';
import { C } from '../art/palette.js';
import { drawText } from '../engine/font.js';
import { Menu } from '../ui/menu.js';
import { BackstoryScene } from './backstory.js';
import { LabScene } from './lab.js';

export class TitleScene extends Scene {
  enter() {
    this.loop();
  }

  async loop() {
    await this.wait(0.4);
    const choice = await this.ask(new Menu(['Start the story', 'Free play'], { x: 110, y: 112, w: 100 }));
    if (choice === 0) {
      game.state = newGame('story');
      game.go(new BackstoryScene());
    } else {
      game.state = newGame('free');
      game.go(new LabScene('free'));
    }
  }

  update(dt) {
    this.baseUpdate(dt);
  }

  draw(ctx) {
    const t = this.t;
    drawDesert(ctx, 0, t);
    drawDerrick(ctx, 30, GROUND_Y - 4, 40, C.dusk);
    drawPumpjack(ctx, 282, GROUND_Y + 2, t, 2);
    drawPumpjack(ctx, 70, GROUND_Y - 6, t + 1.3, 1);
    const walk = Math.floor(t * 4) % 2;
    drawSprite(ctx, walk ? SPR.ceoA : SPR.ceoB, 226, GROUND_Y - 14);

    const bob = Math.round(Math.sin(t * 2) * 1.5);
    drawText(ctx, 'BAYESIAN', 160, 24 + bob, C.yellow, { align: 'center', scale: 3, shadow: C.ink });
    drawText(ctx, 'OIL INC.', 160, 52 + bob, C.orange, { align: 'center', scale: 3, shadow: C.ink });
    drawText(ctx, 'a tiny Bayesian optimisation adventure', 160, 82, C.navy, { align: 'center' });
    drawText(ctx, 'arrows/WASD move   SPACE act   B back   M mute', 160, 170, C.brown, { align: 'center' });

    this.drawOverlay(ctx);
  }
}
