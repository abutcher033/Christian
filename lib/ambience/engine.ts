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
  private flameFilter: BiquadFilterNode | null = null;
  private flameLevel: GainNode | null = null;
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

    const bedBuffer = this.makeNoise(6, 'pink');
    const bed = ctx.createBufferSource();
    bed.buffer = bedBuffer;
    bed.loop = true;
    const flameFilter = ctx.createBiquadFilter();
    flameFilter.type = 'lowpass';
    flameFilter.frequency.value = 280;
    flameFilter.Q.value = 0.6;
    const flameLevel = ctx.createGain();
    flameLevel.gain.value = 0.085;
    const hiss = ctx.createBiquadFilter();
    hiss.type = 'bandpass';
    hiss.frequency.value = 1400;
    hiss.Q.value = 0.45;
    const hissLevel = ctx.createGain();
    hissLevel.gain.value = 0.012;
    bed.connect(flameFilter);
    flameFilter.connect(flameLevel);
    flameLevel.connect(this.fireGain);
    bed.connect(hiss);
    hiss.connect(hissLevel);
    hissLevel.connect(this.fireGain);
    bed.start();
    this.bed = bed;
    this.flameFilter = flameFilter;
    this.flameLevel = flameLevel;

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
    const amount = sceneById(this.scene).fire;
    const wait = amount > 0.05 ? (520 + Math.random() * 1600) / (0.45 + amount) : 1600;
    this.fireTimer = window.setTimeout(() => {
      const fire = sceneById(this.scene).fire;
      if (fire > 0.05) {
        this.breathe(fire);
        this.crackle(fire);
      }
      this.scheduleFire();
    }, wait);
  }

  /** Let the flame swell and thin, the way a real fire licks. */
  private breathe(amount: number) {
    const ctx = this.ctx;
    const filter = this.flameFilter;
    const level = this.flameLevel;
    if (!ctx || !filter || !level) return;
    const now = ctx.currentTime;
    filter.frequency.setTargetAtTime(190 + Math.random() * 280 * (0.35 + amount), now, 0.45);
    level.gain.setTargetAtTime(0.05 + Math.random() * 0.05 * (0.4 + amount), now, 0.55);
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

  private crackle(amount: number) {
    const roll = Math.random();
    const kind: WoodPop = roll < 0.62 ? 'tick' : roll < 0.92 ? 'crack' : 'log';
    this.woodPop(kind, amount);
    if (kind !== 'tick' && Math.random() < 0.4 * amount) {
      const extras = 1 + Math.floor(Math.random() * 2);
      for (let n = 0; n < extras; n += 1) {
        window.setTimeout(() => this.woodPop('tick', amount), 50 + Math.random() * 140 * (n + 1));
      }
    }
  }

  /**
   * A wood fire pops with a hard attack and a short falling knock,
   * then a few quieter ticks as the ember splits.
   */
  private woodPop(kind: WoodPop, amount: number) {
    const ctx = this.ctx;
    const fire = this.fireGain;
    if (!ctx || !fire || ctx.state !== 'running') return;
    const duration =
      kind === 'tick' ? 0.01 + Math.random() * 0.018 : kind === 'crack' ? 0.04 + Math.random() * 0.045 : 0.08 + Math.random() * 0.07;
    const buffer = this.woodBurst(duration, kind);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    if (kind === 'tick') {
      filter.type = 'highpass';
      filter.frequency.value = 1600 + Math.random() * 1800;
      filter.Q.value = 0.6;
    } else {
      filter.type = 'lowpass';
      filter.frequency.value = kind === 'crack' ? 1800 + Math.random() * 1400 : 700 + Math.random() * 500;
      filter.Q.value = 0.45;
    }
    const gain = ctx.createGain();
    const base = kind === 'tick' ? 0.035 : kind === 'crack' ? 0.09 : 0.13;
    gain.gain.value = base * (0.55 + amount * 0.45) + Math.random() * base * 0.25;
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

  private woodBurst(duration: number, kind: WoodPop) {
    const ctx = this.ctx;
    if (!ctx) throw new Error('Audio is not ready.');
    const sampleRate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    const knock = kind === 'tick' ? 0 : 120 + Math.random() * 200;
    const noiseMix = kind === 'tick' ? 1 : 0.82;
    const thumpMix = kind === 'log' ? 0.45 : 0.28;
    let noise = 0;
    let peak = 0;
    for (let i = 0; i < length; i += 1) {
      const t = i / sampleRate;
      const white = Math.random() * 2 - 1;
      const coeff = kind === 'tick' ? 0.72 : kind === 'crack' ? 0.55 : 0.22;
      noise += coeff * (white - noise);
      const env = Math.exp(-t / (duration * (kind === 'tick' ? 0.16 : 0.22)));
      const fall = knock === 0 ? 0 : knock * (1 - 0.55 * Math.min(1, t / 0.035));
      const thump = knock === 0 ? 0 : Math.sin(2 * Math.PI * fall * t) * Math.exp(-t / (duration * 0.2));
      const sample = noise * noiseMix + thump * thumpMix;
      data[i] = sample * env;
      peak = Math.max(peak, Math.abs(data[i]));
    }
    if (peak > 0.001) {
      const scale = 0.85 / peak;
      for (let i = 0; i < length; i += 1) data[i] *= scale;
    }
    return buffer;
  }

  private makeNoise(seconds: number, color: 'white' | 'pink') {
    const ctx = this.ctx;
    if (!ctx) throw new Error('Audio is not ready.');
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      if (color === 'white') {
        data[i] = white;
        continue;
      }
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    if (color === 'pink') {
      const fade = Math.min(length >> 1, Math.floor(ctx.sampleRate * 0.04));
      for (let i = 0; i < fade; i += 1) {
        const edge = i / fade;
        data[i] *= edge;
        data[length - 1 - i] *= edge;
      }
    }
    return buffer;
  }
}

type WoodPop = 'tick' | 'crack' | 'log';

let shared: Ambience | null = null;

export function getAmbience(): Ambience {
  if (!shared) shared = new Ambience();
  return shared;
}
