// audio.js — Ember Clash: tiny synthesized sounds, no audio files.
// One job: blips and thuds from the Web Audio API, nothing fetched.

const AudioFX = {
  enabled: true,
  ctx: null,

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  },

  // One oscillator note: frequency, seconds, wave shape, volume, delay.
  tone(freq, dur, type, vol, delay) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(vol || 0.08, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  },

  click() { this.tone(660, 0.06, "triangle", 0.05, 0); },
  turn() { this.tone(587, 0.09, "triangle", 0.05, 0); this.tone(880, 0.12, "triangle", 0.05, 0.09); },
  draw() { this.tone(520, 0.08, "sine", 0.05, 0); this.tone(780, 0.08, "sine", 0.04, 0.06); },
  playCard() { this.tone(330, 0.12, "triangle", 0.07, 0); this.tone(495, 0.1, "triangle", 0.05, 0.07); },
  hit() { this.tone(140, 0.18, "sawtooth", 0.09, 0); this.tone(90, 0.22, "square", 0.06, 0.02); },
  block() { this.tone(220, 0.12, "square", 0.05, 0); },
  heal() { this.tone(523, 0.12, "sine", 0.06, 0); this.tone(659, 0.12, "sine", 0.06, 0.09); this.tone(784, 0.16, "sine", 0.06, 0.18); },
  echo() { this.tone(880, 0.1, "triangle", 0.06, 0); this.tone(1174, 0.14, "triangle", 0.06, 0.08); },
  win() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => this.tone(f, 0.22, "triangle", 0.07, i * 0.12));
  },
  lose() {
    const notes = [392, 330, 262, 196];
    notes.forEach((f, i) => this.tone(f, 0.25, "sine", 0.07, i * 0.14));
  },
};
