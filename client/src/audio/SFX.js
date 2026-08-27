// ---------------------------------------------------------------------------
// SFX — synthesized combat sound effects (punch, heavy punch, kick, impact
// hits, blocks) generated directly with the Web Audio API. No audio files
// to source or license — every sound is built from oscillators + filtered
// noise bursts with a short amplitude envelope.
//
// Browsers require a user gesture before audio can play; `unlock()` is
// called once on the very first pointerdown/keydown in the game (see
// main.js) to resume the shared AudioContext.
// ---------------------------------------------------------------------------

let ctx = null;
let noiseBuffer = null;
let muted = false;
let masterVolume = 1; // 0..1, controlled from the Settings menu

const SETTINGS_STORAGE_KEY = 'animatrixSettings';

/** Loads any previously-saved volume/mute preference (runs once on import). */
function loadPersistedAudioSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (typeof saved.volume === 'number') masterVolume = Math.max(0, Math.min(1, saved.volume));
    if (typeof saved.muted === 'boolean') muted = saved.muted;
  } catch (e) {
    // localStorage unavailable (e.g. private browsing) or corrupted data — just use defaults.
  }
}
loadPersistedAudioSettings();

function persistAudioSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : {};
    existing.volume = masterVolume;
    existing.muted = muted;
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    // Ignore — settings just won't persist across sessions in this browser.
  }
}

function getContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

/** Sets the master SFX volume (0..1). Persisted/read by the Settings menu. */
export function setVolume(value) {
  masterVolume = Math.max(0, Math.min(1, value));
  persistAudioSettings();
}

export function getVolume() {
  return masterVolume;
}

function getNoiseBuffer() {
  const c = getContext();
  if (!c) return null;
  if (!noiseBuffer) {
    const duration = 0.5;
    const size = Math.floor(c.sampleRate * duration);
    noiseBuffer = c.createBuffer(1, size, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

/** Call once on the first user interaction to satisfy autoplay policies. */
export function unlock() {
  const c = getContext();
  if (c && c.state === 'suspended') c.resume();
}

export function setMuted(value) {
  muted = value;
  persistAudioSettings();
}

export function getMuted() {
  return muted;
}

function noiseBurst({ duration = 0.08, filterType = 'lowpass', freq = 1200, q = 0.7, gain = 0.5, delay = 0 }) {
  const c = getContext();
  if (!c || muted || masterVolume <= 0) return;
  const src = c.createBufferSource();
  src.buffer = getNoiseBuffer();

  const filter = c.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = freq;
  filter.Q.value = q;

  const env = c.createGain();
  const t0 = c.currentTime + delay;
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(gain * masterVolume, t0 + 0.004);
  env.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

  src.connect(filter);
  filter.connect(env);
  env.connect(c.destination);

  src.start(t0);
  src.stop(t0 + duration + 0.02);
}

function thump({ startFreq = 160, endFreq = 55, duration = 0.16, gain = 0.55, type = 'sine', delay = 0 }) {
  const c = getContext();
  if (!c || muted || masterVolume <= 0) return;
  const osc = c.createOscillator();
  osc.type = type;
  const env = c.createGain();
  const t0 = c.currentTime + delay;

  osc.frequency.setValueAtTime(startFreq, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t0 + duration);

  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(gain * masterVolume, t0 + 0.006);
  env.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

  osc.connect(env);
  env.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** Light punch swing. */
export function playPunch() {
  noiseBurst({ duration: 0.07, filterType: 'highpass', freq: 1800, gain: 0.28 });
  thump({ startFreq: 170, endFreq: 70, duration: 0.09, gain: 0.32 });
}

/** Heavy punch swing — bigger, lower, longer. */
export function playHeavyPunch() {
  noiseBurst({ duration: 0.1, filterType: 'highpass', freq: 1200, gain: 0.4 });
  thump({ startFreq: 150, endFreq: 40, duration: 0.22, gain: 0.6 });
  thump({ startFreq: 90, endFreq: 30, duration: 0.28, gain: 0.35, delay: 0.02 });
}

/** Kick swing — duller whoosh + lower thud than a punch. */
export function playKick() {
  noiseBurst({ duration: 0.12, filterType: 'lowpass', freq: 900, gain: 0.35 });
  thump({ startFreq: 130, endFreq: 45, duration: 0.18, gain: 0.5, type: 'triangle' });
}

/**
 * Impact — plays when an attack actually connects (not the swing itself).
 * Sharper/brighter "crack" so a landed hit reads distinctly from the swing.
 */
export function playHit({ big = false } = {}) {
  noiseBurst({ duration: big ? 0.14 : 0.09, filterType: 'bandpass', freq: big ? 1800 : 2400, q: 1.2, gain: big ? 0.6 : 0.42 });
  if (big) {
    thump({ startFreq: 120, endFreq: 35, duration: 0.24, gain: 0.5, delay: 0.01 });
  }
}

/** Special — bigger telegraph, dramatic charge-up rise then a heavy impact. */
export function playSpecial() {
  const c = getContext();
  if (!c || muted || masterVolume <= 0) return;
  // Rising charge tone
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  const env = c.createGain();
  const t0 = c.currentTime;
  osc.frequency.setValueAtTime(90, t0);
  osc.frequency.exponentialRampToValueAtTime(340, t0 + 0.32);
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(0.22 * masterVolume, t0 + 0.1);
  env.gain.linearRampToValueAtTime(0.3 * masterVolume, t0 + 0.3);
  env.gain.exponentialRampToValueAtTime(0.001, t0 + 0.36);
  osc.connect(env);
  env.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + 0.38);

  // Big impact landing right after the charge
  noiseBurst({ duration: 0.16, filterType: 'bandpass', freq: 1500, q: 1, gain: 0.7, delay: 0.34 });
  thump({ startFreq: 140, endFreq: 30, duration: 0.3, gain: 0.65, delay: 0.34 });
  thump({ startFreq: 80, endFreq: 25, duration: 0.36, gain: 0.4, delay: 0.36 });
}

/** Block — metallic-ish clash, distinct from a landed hit. */
export function playBlock() {
  noiseBurst({ duration: 0.09, filterType: 'highpass', freq: 2600, q: 1.5, gain: 0.35 });
  thump({ startFreq: 700, endFreq: 500, duration: 0.07, gain: 0.18, type: 'square' });
}

/** Power blast fired — a quick rising laser-ish zap. */
export function playPower() {
  const c = getContext();
  if (!c || muted || masterVolume <= 0) return;
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  const env = c.createGain();
  const t0 = c.currentTime;
  osc.frequency.setValueAtTime(520, t0);
  osc.frequency.exponentialRampToValueAtTime(1400, t0 + 0.11);
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(0.24 * masterVolume, t0 + 0.02);
  env.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14);
  osc.connect(env);
  env.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + 0.16);
  noiseBurst({ duration: 0.06, filterType: 'highpass', freq: 3000, gain: 0.18 });
}

/** Double jump — a light airy "flap". */
export function playDoubleJump() {
  thump({ startFreq: 420, endFreq: 680, duration: 0.1, gain: 0.22, type: 'sine' });
  noiseBurst({ duration: 0.06, filterType: 'highpass', freq: 2200, gain: 0.14 });
}

/** Rage activating — a low ominous rumble swell. */
export function playRageActivate() {
  const c = getContext();
  if (!c || muted || masterVolume <= 0) return;
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  const env = c.createGain();
  const t0 = c.currentTime;
  osc.frequency.setValueAtTime(60, t0);
  osc.frequency.linearRampToValueAtTime(85, t0 + 0.4);
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(0.28 * masterVolume, t0 + 0.15);
  env.gain.linearRampToValueAtTime(0, t0 + 0.45);
  osc.connect(env);
  env.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + 0.46);
}
