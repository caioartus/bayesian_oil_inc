import { game, W, H } from './game/game.js';
import { input, initInput } from './engine/input.js';
import { TitleScene } from './scenes/title.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ?touch forces the phone layout, for testing on a desktop browser.
const touch = window.matchMedia('(pointer: coarse)').matches || new URLSearchParams(location.search).has('touch');

function resize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const portrait = vh > vw;
  document.body.classList.toggle('touch', touch);
  document.body.classList.toggle('portrait', touch && portrait);
  document.body.classList.toggle('landscape', touch && !portrait);
  let s;
  if (touch) {
    // Phones: use every pixel. In landscape the buttons float on top of the
    // game; in portrait they sit in the spare space below it.
    s = Math.min(vw / W, (portrait ? vh - 190 : vh) / H);
  } else {
    s = Math.min((vw - 16) / W, (vh - 24) / H);
    if (s >= 2) s = Math.floor(s);
  }
  canvas.style.width = `${Math.floor(W * s)}px`;
  canvas.style.height = `${Math.floor(H * s)}px`;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
resize();

// "Turn your phone" tip: on Android this also goes fullscreen + landscape.
document.getElementById('rotate').addEventListener('click', async () => {
  try {
    await document.documentElement.requestFullscreen?.();
    await screen.orientation?.lock?.('landscape');
  } catch {
    /* not supported (e.g. iOS): the tip still tells players what to do */
  }
  resize();
});

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
