// WebAudio 芯片音效 —— 仿 FC 风格
let ac: AudioContext | null = null;

export function initAudio() {
  if (!ac) {
    try { ac = new AudioContext(); } catch { ac = null; }
  }
  if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.06, when = 0, slide = 0) {
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.linearRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(ac.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

function noise(dur: number, vol = 0.08, when = 0, lp = 1200) {
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = lp;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(ac.destination);
  src.start(t0);
}

export const sfx = {
  cursor: () => tone(880, 0.05, 'square', 0.04),
  confirm: () => { tone(660, 0.06, 'square', 0.05); tone(990, 0.09, 'square', 0.05, 0.06); },
  cancel: () => tone(330, 0.08, 'square', 0.05),
  hit: () => { noise(0.12, 0.1, 0, 900); tone(180, 0.1, 'sawtooth', 0.06, 0, -80); },
  bigHit: () => { noise(0.25, 0.14, 0, 700); tone(120, 0.25, 'sawtooth', 0.08, 0, -60); },
  fire: () => { noise(0.5, 0.1, 0, 500); tone(90, 0.4, 'sawtooth', 0.05, 0.05, -40); },
  heal: () => { tone(520, 0.12, 'sine', 0.06); tone(660, 0.12, 'sine', 0.06, 0.1); tone(880, 0.2, 'sine', 0.06, 0.2); },
  flee: () => tone(500, 0.3, 'square', 0.05, 0, 300),
  dead: () => tone(300, 0.4, 'sawtooth', 0.06, 0, -220),
  victory: () => {
    const notes = [523, 523, 523, 659, 784, 784, 1047];
    notes.forEach((n, i) => tone(n, i === 6 ? 0.5 : 0.12, 'square', 0.06, i * 0.13));
  },
  defeat: () => {
    const notes = [392, 370, 349, 330];
    notes.forEach((n, i) => tone(n, 0.3, 'sawtooth', 0.06, i * 0.3));
  },
  step: () => tone(140, 0.03, 'triangle', 0.015),
};
