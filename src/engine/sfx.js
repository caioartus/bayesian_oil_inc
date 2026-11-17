// A tiny WebAudio synth for retro bleeps. The audio context is only created
// after the first user gesture (browsers block it before that).

let ac = null;
let master = null;
let muted = false;
try {
  muted = localStorage.getItem('boi-muted') === '1';
} catch {
  /* storage unavailable */
}

export function unlock() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = muted ? 0 : 0.6;
    master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
}

export const isMuted = () => muted;

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.6;
  try {
    localStorage.setItem('boi-muted', muted ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function tone(freq, dur = 0.08, { type = 'square', vol = 0.06, slide = 0, delay = 0 } = {}) {
  if (!ac || muted) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

let noiseBuf = null;
function noise(dur, { vol = 0.08, freq = 800, q = 1, delay = 0, sweep = 0 } = {}) {
  if (!ac || muted) return;
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ac.currentTime + delay;
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq + sweep), t + dur);
  f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.05);
}

export const sfx = {
  type: () => tone(520 + Math.random() * 120, 0.03, { vol: 0.025 }),
  select: () => tone(660, 0.05, { vol: 0.04 }),
  confirm: () => {
    tone(660, 0.06, { vol: 0.05 });
    tone(990, 0.09, { vol: 0.05, delay: 0.06 });
  },
  bad: () => tone(200, 0.15, { vol: 0.05, slide: -80, type: 'sawtooth' }),
  step: () => noise(0.03, { vol: 0.02, freq: 1800 }),
  drop: () => tone(300, 0.15, { slide: -200, type: 'triangle', vol: 0.1 }),
  drill: () => {
    for (let i = 0; i < 10; i++) tone(70 + (i % 2) * 15, 0.11, { type: 'sawtooth', vol: 0.05, delay: i * 0.11 });
    noise(1.2, { vol: 0.06, freq: 300, q: 0.8 });
  },
  gush: (big) => {
    noise(0.9, { vol: 0.05 + big * 0.07, freq: 500, sweep: 1500, q: 0.6 });
    tone(220, 0.4, { type: 'triangle', slide: 440 * big + 60, vol: 0.06 });
  },
  ring: () => {
    for (let i = 0; i < 6; i++) tone(i % 2 ? 1320 : 1100, 0.06, { vol: 0.04, delay: i * 0.07 });
  },
  shout: () => {
    tone(180, 0.25, { type: 'sawtooth', vol: 0.06, slide: 120 });
    noise(0.25, { vol: 0.04, freq: 900 });
  },
  jingle: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, { vol: 0.05, delay: i * 0.1 })),
  fanfare: () =>
    [523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, { vol: 0.05, delay: i * 0.12, type: 'triangle' })),
  sad: () => [392, 370, 349, 330].forEach((f, i) => tone(f, 0.25, { vol: 0.05, delay: i * 0.22, type: 'triangle' })),
  build: () => {
    for (let i = 0; i < 6; i++) noise(0.08, { vol: 0.05, freq: 600 + i * 150, delay: i * 0.15 });
  },
};
