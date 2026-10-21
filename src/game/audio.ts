import type { Settings } from "@/game/types";

export class AudioBus {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  sfx: GainNode | null = null;
  music: GainNode | null = null;
  noise: AudioBuffer | null = null;
  wind: AudioBufferSourceNode | null = null;
  musicOsc: OscillatorNode[] = [];
  musicGain: GainNode | null = null;
  tension = 0;
  targetTension = 0;
  heartbeatAt = 0;
  settings: Settings | null = null;

  unlock(settings: Settings) {
    this.settings = settings;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      this.ctx = new AC({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.sfx.connect(this.master);
      this.music.connect(this.master);
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buf;
      this.startBed();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.apply(settings);
  }

  apply(settings: Settings) {
    this.settings = settings;
    if (!this.ctx || !this.master || !this.sfx || !this.music) return;
    const t = this.ctx.currentTime;
    const curve = (v: number) => v * v;
    this.master.gain.setTargetAtTime(curve(settings.volume), t, 0.03);
    this.sfx.gain.setTargetAtTime(curve(settings.sfx), t, 0.03);
    this.music.gain.setTargetAtTime(curve(settings.music), t, 0.05);
  }

  private startBed() {
    if (!this.ctx || !this.noise || !this.music || !this.sfx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    const g = this.ctx.createGain();
    g.gain.value = 0.045;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.music);
    src.start();
    this.wind = src;

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.04;
    this.musicGain.connect(this.music);
    const freqs = [73, 110, 146];
    for (const f of freqs) {
      const o = this.ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const og = this.ctx.createGain();
      og.gain.value = 0.22;
      o.connect(og);
      og.connect(this.musicGain);
      o.start();
      this.musicOsc.push(o);
    }
  }

  setListener(x: number, y: number, z: number, fx: number, fy: number, fz: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    const l = ctx.listener;
    const t = ctx.currentTime;
    if (l.positionX) {
      l.positionX.setValueAtTime(x, t);
      l.positionY.setValueAtTime(y, t);
      l.positionZ.setValueAtTime(z, t);
      l.forwardX.setValueAtTime(fx, t);
      l.forwardY.setValueAtTime(fy, t);
      l.forwardZ.setValueAtTime(fz, t);
      l.upX.setValueAtTime(0, t);
      l.upY.setValueAtTime(1, t);
      l.upZ.setValueAtTime(0, t);
    }
  }

  setTension(v: number) {
    this.targetTension = Math.max(0, Math.min(1, v));
  }

  tick(dt: number, lowHealth: boolean) {
    if (!this.ctx || !this.musicGain) return;
    this.tension += (this.targetTension - this.tension) * Math.min(1, dt * 2);
    const t = this.ctx.currentTime;
    this.musicGain.gain.setTargetAtTime(0.03 + this.tension * 0.08, t, 0.1);
    const base = [73, 110, 164];
    this.musicOsc.forEach((o, i) => {
      const wobble = Math.sin(t * (0.2 + i * 0.07) + i) * 1.5;
      o.frequency.setTargetAtTime((base[i] ?? 80) + wobble + this.tension * 12, t, 0.2);
    });
    if (lowHealth && t > this.heartbeatAt) {
      this.heartbeatAt = t + 0.85;
      this.tone(58, 0.18, "sine", 0.2, this.sfx);
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, dest: AudioNode | null, slide = 0.5) {
    if (!this.ctx || !dest) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private burst(dur: number, freq: number, gain: number, dest: AudioNode | null, rate = 1) {
    if (!this.ctx || !this.noise || !dest) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = rate;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(freq, t);
    filter.Q.value = 0.7;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  private place(x: number, y: number, z: number): AudioNode | null {
    if (!this.ctx || !this.sfx) return null;
    const p = this.ctx.createPanner();
    p.panningModel = "equalpower";
    p.distanceModel = "inverse";
    p.refDistance = 2.2;
    p.maxDistance = 38;
    p.rolloffFactor = 1.15;
    if (p.positionX) {
      p.positionX.value = x;
      p.positionY.value = y;
      p.positionZ.value = z;
    }
    p.connect(this.sfx);
    return p;
  }

  gun(kind: "pistol" | "shotgun") {
    const heavy = kind === "shotgun";
    this.burst(heavy ? 0.22 : 0.12, heavy ? 480 : 1400, heavy ? 0.55 : 0.32, this.sfx, heavy ? 0.7 : 1);
    this.tone(heavy ? 90 : 160, heavy ? 0.18 : 0.09, "triangle", heavy ? 0.28 : 0.16, this.sfx, 0.35);
  }

  dry() {
    this.burst(0.04, 1800, 0.12, this.sfx, 1.4);
  }

  reload() {
    this.burst(0.05, 900, 0.16, this.sfx, 1.2);
    window.setTimeout(() => this.burst(0.06, 600, 0.14, this.sfx, 0.8), 180);
    window.setTimeout(() => this.tone(220, 0.06, "square", 0.05, this.sfx, 0.8), 340);
  }

  melee() {
    this.burst(0.08, 300, 0.22, this.sfx, 0.6);
    this.tone(90, 0.1, "sawtooth", 0.06, this.sfx, 0.4);
  }

  hit(flesh = true) {
    this.burst(0.07, flesh ? 280 : 1600, flesh ? 0.22 : 0.1, this.sfx, flesh ? 0.8 : 1.5);
  }

  hurt() {
    this.tone(140, 0.2, "sawtooth", 0.08, this.sfx, 0.4);
    this.burst(0.12, 200, 0.2, this.sfx, 0.5);
  }

  foot(x: number, y: number, z: number) {
    const dest = this.place(x, y, z) ?? this.sfx;
    this.burst(0.05, 180 + Math.random() * 60, 0.08, dest, 0.7 + Math.random() * 0.3);
  }

  groan(x: number, y: number, z: number, deep = false) {
    const dest = this.place(x, y, z);
    this.tone(deep ? 50 : 90 + Math.random() * 40, deep ? 0.6 : 0.35, "sawtooth", deep ? 0.12 : 0.07, dest, 0.7);
  }

  shotIncoming(x: number, y: number, z: number) {
    const dest = this.place(x, y, z);
    this.burst(0.08, 700, 0.12, dest, 0.9);
  }

  pickup() {
    this.tone(520, 0.08, "sine", 0.06, this.sfx, 1.4);
    this.tone(780, 0.1, "sine", 0.04, this.sfx, 1.2);
  }

  locked() {
    this.tone(90, 0.12, "square", 0.05, this.sfx, 0.6);
  }

  radio() {
    this.burst(0.15, 1200, 0.08, this.sfx, 0.4);
    this.tone(440, 0.2, "sine", 0.04, this.sfx, 1);
  }

  brazier(ok: boolean) {
    this.tone(ok ? 196 : 70, 0.25, ok ? "triangle" : "sawtooth", 0.08, this.sfx, ok ? 1.5 : 0.5);
  }

  bell() {
    this.tone(220, 1.2, "sine", 0.08, this.music, 0.6);
    this.tone(330, 1.1, "sine", 0.04, this.music, 0.55);
  }

  bossDie() {
    this.tone(48, 1.4, "sawtooth", 0.12, this.sfx, 0.3);
    this.bell();
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }
}
