import { game, W, H } from './game/game.js';
import { input, initInput } from './engine/input.js';
import { TitleScene } from './scenes/title.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function resize() {
  const touch = window.matchMedia('(pointer: coarse)').matches;
  const availH = window.innerHeight - (touch ? 110 : 24);
  const availW = window.innerWidth - 16;
  let s = Math.min(availW / W, availH / H);
  if (s >= 2) s = Math.floor(s);
  canvas.style.width = `${Math.floor(W * s)}px`;
  canvas.style.height = `${Math.floor(H * s)}px`;
}
window.addEventListener('resize', resize);
resize();

initInput(canvas, W, H);
canvas.focus();

game.start(new TitleScene());
window.__boi = game; // handy for debugging in the console

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  // Freeze scene input while a fade is running.
  if (game.pending) input.endFrame();
  game.scene.update(dt);
  game.scene.draw(ctx);
  if (game.fade > 0) {
    ctx.fillStyle = `rgba(26,28,44,${game.fade})`;
    ctx.fillRect(0, 0, W, H);
  }
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
