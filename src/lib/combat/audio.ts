/** Web Audio SFX — sintetizados em camadas. Unlock no primeiro gesto. */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfx: GainNode | null = null;
let crowd: GainNode | null = null;
let noise: AudioBuffer | null = null;
let unlocked = false;
let crowdTimer: number | null = null;
let crowdSrc: AudioBufferSourceNode | null = null;
let crowdGain: GainNode | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfx = ctx.createGain();
    crowd = ctx.createGain();
    sfx.connect(master);
    crowd.connect(master);
    master.connect(ctx.destination);
    master.gain.value = 1;
    sfx.gain.value = 0.85;
    crowd.gain.value = 0.35;
  }
  return ctx;
}

export function isAudioUnlocked() {
  return unlocked && ctx?.state === "running";
}

export function unlockAudio() {
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  unlocked = true;
  if (!noise) noise = makeNoise(c);
  startCrowd();
}

export function setVolumes(sfxVol: number, crowdVol: number) {
  const c = ac();
  if (!c || !sfx || !crowd) return;
  const now = c.currentTime;
  sfx.gain.setTargetAtTime(sfxVol * sfxVol, now, 0.03);
  crowd.gain.setTargetAtTime(crowdVol * crowdVol * 0.55, now, 0.05);
}

function makeNoise(c: AudioContext) {
  const len = c.sampleRate * 1.6;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = last * 0.7 + white * 0.3;
    data[i] = last;
  }
  return buf;
}

function envGain(
  c: AudioContext,
  dest: AudioNode,
  attack: number,
  hold: number,
  release: number,
  peak = 1,
) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(peak, c.currentTime + Math.max(0.004, attack));
  g.gain.exponentialRampToValueAtTime(peak * 0.72, c.currentTime + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + attack + hold + release);
  g.connect(dest);
  return g;
}

function playNoise(duration: number, cutoff: number, peak: number, type: BiquadFilterType = "bandpass") {
  const c = ac();
  if (!c || !sfx || !noise || !unlocked) return;
  const src = c.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  src.playbackRate.value = 0.92 + Math.random() * 0.16;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = cutoff;
  f.Q.value = type === "bandpass" ? 0.85 : 0.6;
  const g = envGain(c, sfx, 0.004, duration * 0.22, duration * 0.72, peak);
  src.connect(f);
  f.connect(g);
  src.start();
  src.stop(c.currentTime + duration);
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType,
  peak: number,
  glide = 0.45,
) {
  const c = ac();
  if (!c || !sfx || !unlocked) return;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(Math.max(28, freq * glide), c.currentTime + duration);
  const g = envGain(c, sfx, 0.005, duration * 0.18, duration * 0.78, peak);
  o.connect(g);
  o.start();
  o.stop(c.currentTime + duration + 0.03);
}

function playNote(freq: number, duration: number, peak: number, type: OscillatorType = "sine") {
  const c = ac();
  if (!c || !sfx || !unlocked) return;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = envGain(c, sfx, 0.008, duration * 0.25, duration * 0.7, peak);
  o.connect(g);
  o.start();
  o.stop(c.currentTime + duration + 0.02);
}

function cheer(peak = 0.22) {
  playNoise(0.35, 1400, peak, "bandpass");
  playNoise(0.28, 700, peak * 0.7, "lowpass");
}

export function sfxPunch() {
  const rate = 0.9 + Math.random() * 0.2;
  playNoise(0.055, 1900 * rate, 0.42);
  playNoise(0.08, 420 * rate, 0.28, "lowpass");
  playTone(72 * rate, 0.16, "sine", 0.62, 0.38);
  playTone(210 * rate, 0.05, "square", 0.07, 0.5);
  playTone(1400 * rate, 0.03, "triangle", 0.05, 0.2);
}

export function sfxHeavy() {
  const rate = 0.94 + Math.random() * 0.1;
  playNoise(0.14, 900 * rate, 0.55, "lowpass");
  playNoise(0.1, 1600 * rate, 0.35);
  playTone(52 * rate, 0.28, "sine", 0.72, 0.32);
  playTone(96 * rate, 0.18, "triangle", 0.22, 0.4);
  playTone(340 * rate, 0.08, "square", 0.08, 0.45);
  cheer(0.18);
}

export function sfxSpecial() {
  playNoise(0.22, 500, 0.45, "lowpass");
  playNoise(0.16, 2200, 0.32);
  playTone(64, 0.34, "sawtooth", 0.28, 0.55);
  playTone(160, 0.26, "square", 0.1, 0.5);
  playTone(480, 0.2, "triangle", 0.14, 0.7);
  playTone(720, 0.12, "sine", 0.08, 0.8);
  cheer(0.24);
}

export function sfxKo() {
  playTone(48, 0.9, "sine", 0.78, 0.28);
  playTone(72, 0.7, "triangle", 0.28, 0.35);
  playNoise(0.7, 380, 0.48, "lowpass");
  playNoise(0.45, 1100, 0.22);
  playTone(196, 0.35, "sine", 0.16, 0.5);
  setTimeout(() => cheer(0.32), 80);
}

export function sfxGift() {
  playNote(880, 0.12, 0.16);
  playNote(1320, 0.14, 0.12, "triangle");
  playNote(1760, 0.1, 0.08);
}

export function sfxBuff() {
  playNote(523, 0.2, 0.16);
  playNote(659, 0.24, 0.13);
  playNote(784, 0.28, 0.1, "triangle");
}

export function sfxRose() {
  playNote(698, 0.14, 0.14);
  playNote(880, 0.16, 0.12, "triangle");
  playNoise(0.12, 2400, 0.08);
}

export function sfxGalaxy() {
  playTone(40, 0.8, "sine", 0.4, 1.4);
  playTone(80, 0.7, "sawtooth", 0.12, 1.6);
  playNote(523, 0.4, 0.1);
  playNote(784, 0.5, 0.08, "triangle");
  playNoise(0.6, 600, 0.28, "lowpass");
  cheer(0.28);
}

export function sfxCombo(hits: number) {
  const n = Math.min(8, hits);
  playNote(440 + n * 80, 0.1, 0.12);
  playNote(660 + n * 90, 0.12, 0.1, "triangle");
  sfxPunch();
}

export function sfxByVisual(visual: string, action: string) {
  if (visual === "rose" || visual === "white-rose" || visual === "heart") {
    sfxRose();
    return;
  }
  if (visual === "fireworks" || visual === "galaxy") {
    sfxGalaxy();
    return;
  }
  if (action === "buff") {
    sfxBuff();
    return;
  }
  if (action === "special" || action === "spectacle") {
    sfxSpecial();
    return;
  }
  if (action === "combo") {
    sfxCombo(3);
    return;
  }
  sfxGift();
}

function startCrowd() {
  const c = ac();
  if (!c || !crowd || !noise || crowdSrc) return;
  const src = c.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 980;
  const g = c.createGain();
  g.gain.value = 0.1;
  src.connect(f);
  f.connect(g);
  g.connect(crowd);
  src.start();
  crowdSrc = src;
  crowdGain = g;
  const pulse = () => {
    if (!c || !g) return;
    const target = 0.07 + Math.random() * 0.08;
    g.gain.setTargetAtTime(target, c.currentTime, 0.45);
    crowdTimer = window.setTimeout(pulse, 700 + Math.random() * 900);
  };
  pulse();
}

export function resumeAudioIfNeeded() {
  if (!unlocked || !ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
}
