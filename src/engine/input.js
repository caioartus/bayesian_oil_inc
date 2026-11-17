// Keyboard, touch buttons and pointer input, polled once per frame.
import { unlock, toggleMute, isMuted } from './sfx.js';

const KEYMAP = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  Space: 'a',
  Enter: 'a',
  KeyE: 'a',
  KeyZ: 'a',
  Escape: 'b',
  KeyX: 'b',
  KeyQ: 'b',
  KeyB: 'b',
  Backspace: 'b',
};

const held = new Set();
const pressed = new Set();

export const input = {
  click: null, // {x, y} in game pixels, for this frame only
  pointer: null, // last pointer position in game pixels
  down: (a) => held.has(a),
  pressed: (a) => pressed.has(a),
  consume(a) {
    pressed.delete(a);
    if (a === 'a') this.click = null;
  },
  anyPressed() {
    return pressed.has('a') || this.click !== null;
  },
  endFrame() {
    pressed.clear();
    this.click = null;
  },
};

export function initInput(canvas, W, H) {
  const muteBtn = document.getElementById('mute');
  const syncMute = () => muteBtn.classList.toggle('off', isMuted());
  muteBtn.addEventListener('click', () => {
    unlock();
    toggleMute();
    syncMute();
    canvas.focus();
  });

  window.addEventListener('keydown', (e) => {
    unlock();
    if (e.code === 'KeyM') {
      toggleMute();
      syncMute();
      return;
    }
    const a = KEYMAP[e.code];
    if (!a) return;
    e.preventDefault();
    if (!held.has(a)) pressed.add(a);
    held.add(a);
  });
  window.addEventListener('keyup', (e) => {
    const a = KEYMAP[e.code];
    if (a) held.delete(a);
  });
  window.addEventListener('blur', () => held.clear());

  const toGame = (e) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: Math.floor(((e.clientX - r.left) / r.width) * W),
      y: Math.floor(((e.clientY - r.top) / r.height) * H),
    };
  };
  canvas.addEventListener('pointerdown', (e) => {
    unlock();
    canvas.focus();
    input.click = toGame(e);
    input.pointer = input.click;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') input.pointer = toGame(e);
  });
  canvas.addEventListener('pointerleave', () => (input.pointer = null));

  for (const btn of document.querySelectorAll('#touch [data-btn]')) {
    const a = btn.dataset.btn;
    const on = (e) => {
      e.preventDefault();
      unlock();
      if (!held.has(a)) pressed.add(a);
      held.add(a);
    };
    const off = (e) => {
      e.preventDefault();
      held.delete(a);
    };
    btn.addEventListener('pointerdown', on);
    btn.addEventListener('pointerup', off);
    btn.addEventListener('pointercancel', off);
    btn.addEventListener('pointerleave', off);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}
