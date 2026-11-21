// LANTERN HEIST — audio.js
// Synthesized sound only (WebAudio oscillators): footsteps, coin ring,
// pickup chime, alert sting, win jingle. No audio files, no network.

export class AudioBank {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
      } catch (e) {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  tone(freq, dur, type, gain, when = 0, slideTo = null) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.08, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  footstep(sneaking) {
    this.tone(sneaking ? 140 : 190, 0.07, 'triangle', sneaking ? 0.02 : 0.045);
  }

  coinRing() {
    this.tone(1568, 0.28, 'sine', 0.09);
    this.tone(2093, 0.22, 'sine', 0.06, 0.05);
  }

  pickup() {
    this.tone(880, 0.14, 'sine', 0.09);
    this.tone(1318, 0.2, 'sine', 0.09, 0.09);
  }

  alertSting() {
    this.tone(220, 0.35, 'sawtooth', 0.1, 0, 440);
    this.tone(233, 0.35, 'sawtooth', 0.08, 0.02, 466);
  }

  suspiciousBlip() {
    this.tone(520, 0.16, 'square', 0.05, 0, 660);
  }

  caught() {
    this.tone(196, 0.5, 'sawtooth', 0.11, 0, 98);
    this.tone(147, 0.7, 'sawtooth', 0.1, 0.18, 73);
  }

  win() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.09, i * 0.13));
  }
}
