import { sceneById, type StudySceneId } from '@/lib/study/scenes';

/**
 * Procedural study sounds: fire, rain, and birds.
 * Nothing is fetched. Playback starts after a user gesture unlocks audio.
 */
export class Ambience {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private fireGain: GainNode | null = null;
  private birdGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private bed: AudioBufferSourceNode | null = null;
  private rain: AudioBufferSourceNode | null = null;
  private fireTimer = 0;
  private birdTimer = 0;
  private scene: StudySceneId = 'hearth';
  private volume = 0.7;
  private muted = false;
  private loops = false;

  setScene(scene: StudySceneId) {
    this.scene = scene;
    this.applyMix();
  }

  setVolume(volume: number) {
    this.volume = Math.min(1, Math.max(0, volume));
    this.applyMix();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.applyMix();
  }

  /** Call from a click or key press. Safe to call often. */
  async resume() {
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        return;
      }
    }
    this.startLoops();
  }

  rustle() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || this.muted || ctx.state !== 'running') return;
    const duration = 0.18;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      const env = Math.sin((i / length) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 900;
    const gain = ctx.createGain();
    gain.gain.value = 0.12 * this.volume;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.ctx) return this.ctx;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    const fireGain = ctx.createGain();
    const birdGain = ctx.createGain();
    const rainGain = ctx.createGain();
    fireGain.connect(master);
    birdGain.connect(master);
    rainGain.connect(master);
    this.ctx = ctx;
    this.master = master;
    this.fireGain = fireGain;
    this.birdGain = birdGain;
    this.rainGain = rainGain;
    this.applyMix();
    return ctx;
  }

  private startLoops() {
    if (this.loops) return;
    const ctx = this.ensure();
    if (!ctx || !this.fireGain || !this.rainGain) return;
    this.loops = true;

    const bedBuffer = this.makeNoise(2.5, 'brown');
    const bed = ctx.createBufferSource();
    bed.buffer = bedBuffer;
    bed.loop = true;
    const bedFilter = ctx.createBiquadFilter();
    bedFilter.type = 'lowpass';
    bedFilter.frequency.value = 380;
    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.22;
    bed.connect(bedFilter);
    bedFilter.connect(bedGain);
    bedGain.connect(this.fireGain);
    bed.start();
    this.bed = bed;

    const rainBuffer = this.makeNoise(2, 'white');
    const rain = ctx.createBufferSource();
    rain.buffer = rainBuffer;
    rain.loop = true;
    const rainHigh = ctx.createBiquadFilter();
    rainHigh.type = 'highpass';
    rainHigh.frequency.value = 700;
    const rainLow = ctx.createBiquadFilter();
    rainLow.type = 'lowpass';
    rainLow.frequency.value = 4200;
    rain.connect(rainHigh);
    rainHigh.connect(rainLow);
    rainLow.connect(this.rainGain);
    rain.start();
    this.rain = rain;

    this.scheduleFire();
    this.scheduleBird();
  }

  private applyMix() {
    const ctx = this.ctx;
    const master = this.master;
    const fire = this.fireGain;
    const birds = this.birdGain;
    const rain = this.rainGain;
    if (!ctx || !master || !fire || !birds || !rain) return;
    const now = ctx.currentTime;
    const preset = sceneById(this.scene);
    const level = this.muted ? 0 : this.volume;
    master.gain.setTargetAtTime(level, now, 0.08);
    fire.gain.setTargetAtTime(preset.fire, now, 0.12);
    birds.gain.setTargetAtTime(preset.birds, now, 0.15);
    rain.gain.setTargetAtTime(preset.rain * 0.22, now, 0.18);
  }

  private scheduleFire() {
    window.clearTimeout(this.fireTimer);
    const preset = sceneById(this.scene);
    const wait = preset.fire > 0.05 ? 50 + Math.random() * (preset.fire > 0.7 ? 140 : 320) : 400;
    this.fireTimer = window.setTimeout(() => {
      if (sceneById(this.scene).fire > 0.05) this.crackle();
      this.scheduleFire();
    }, wait);
  }

  private scheduleBird() {
    window.clearTimeout(this.birdTimer);
    const preset = sceneById(this.scene);
    const wait = preset.birds > 0.05 ? 700 + Math.random() * (preset.birds > 0.6 ? 1800 : 4200) : 1200;
    this.birdTimer = window.setTimeout(() => {
      if (sceneById(this.scene).birds > 0.05 && !this.muted) {
        this.chirp();
        if (Math.random() < 0.45) {
          window.setTimeout(() => this.chirp(true), 180 + Math.random() * 280);
        }
      }
      this.scheduleBird();
    }, wait);
  }

  private crackle() {
    const ctx = this.ctx;
    const fire = this.fireGain;
    if (!ctx || !fire || ctx.state !== 'running') return;
    const loud = Math.random() > 0.82;
    const duration = loud ? 0.09 + Math.random() * 0.08 : 0.025 + Math.random() * 0.05;
    const buffer = this.burst(duration);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = loud ? 'lowpass' : 'bandpass';
    filter.frequency.value = loud ? 500 + Math.random() * 400 : 600 + Math.random() * 2200;
    filter.Q.value = loud ? 0.6 : 0.8;
    const gain = ctx.createGain();
    gain.gain.value = (loud ? 0.55 : 0.18) + Math.random() * 0.2;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(fire);
    src.start();
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  private chirp(reply = false) {
    const ctx = this.ctx;
    const birds = this.birdGain;
    if (!ctx || !birds || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.01;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const base = (reply ? 2400 : 1700) + Math.random() * 1600;
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.linearRampToValueAtTime(base * (1.25 + Math.random() * 0.35), t + 0.05);
    osc.frequency.linearRampToValueAtTime(base * (0.8 + Math.random() * 0.15), t + 0.1);
    osc.frequency.linearRampToValueAtTime(base * (1.4 + Math.random() * 0.4), t + 0.16);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = base;
    filter.Q.value = 4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(reply ? 0.045 : 0.07, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(birds);
    osc.start(t);
    osc.stop(t + 0.22);
    osc.onended = () => {
      osc.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  private burst(duration: number) {
    const ctx = this.ctx;
    if (!ctx) throw new Error('Audio is not ready.');
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      const env = Math.sin((i / length) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    return buffer;
  }

  private makeNoise(seconds: number, color: 'white' | 'brown') {
    const ctx = this.ctx;
    if (!ctx) throw new Error('Audio is not ready.');
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      if (color === 'brown') {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.2;
      } else {
        data[i] = white;
      }
    }
    return buffer;
  }
}

let shared: Ambience | null = null;

export function getAmbience(): Ambience {
  if (!shared) shared = new Ambience();
  return shared;
}
