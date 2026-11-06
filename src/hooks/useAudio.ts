import { getState, setState, useExperience } from '../state/store';

/**
 * All sound is synthesised with Web Audio: a tanpura-like drone (Pa, Sa, Sa, Sa'),
 * a temple-bell strike, and a soft match-strike for ignition. Nothing downloads,
 * nothing autoplays: the context is created on the first SOUND ON.
 *
 * The graph is: voices -> master (the on/off ramp) -> out (the volume slider)
 * -> speakers, with a parallel convolution tail off master. Fireworks book
 * their own bus off master (see fireworks/audio.ts), so muting, the volume
 * slider and the courtyard reverb all apply to them for free.
 */

const SA = 130.81; // C3
const DRONE_LEVEL = 0.15;

class AmbientAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private out: GainNode | null = null;
  private fx: GainNode | null = null;
  private droneStarted = false;

  private ensure(): AudioContext {
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0;
    const out = ctx.createGain();
    out.gain.value = getState().volume;
    // A long, dark reverb tail from a generated impulse: the sound of a courtyard at night.
    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(ctx, 3.8);
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    /**
     * A limiter on the way out. Everything here is synthesised hot so the bangs
     * carry, and without this the loudest moments — a cake's finale over the
     * drone — would sum past full scale and clip. Catching the peaks instead
     * means the whole piece can sit louder.
     */
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -9;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    master.connect(limiter);
    master.connect(reverb).connect(wet).connect(limiter);
    limiter.connect(out);
    out.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    this.out = out;
    return ctx;
  }

  /**
   * The bus firecracker voices connect to, or null when sound is off. Callers
   * must treat null as "stay silent" rather than as an error: audio is never
   * required for the visual experience to work.
   */
  fireworkBus(): { ctx: AudioContext; node: GainNode } | null {
    if (!this.active || !this.ctx || !this.master) return null;
    if (!this.fx) {
      this.fx = this.ctx.createGain();
      // Firecrackers sit well above the drone; the limiter keeps the peaks honest.
      this.fx.gain.value = 1.75;
      this.fx.connect(this.master);
    }
    return { ctx: this.ctx, node: this.fx };
  }

  /** Master volume, 0..1, ramped so a drag on the slider never clicks. */
  setVolume(value: number): void {
    if (!this.ctx || !this.out) return;
    this.out.gain.cancelScheduledValues(this.ctx.currentTime);
    this.out.gain.setTargetAtTime(value, this.ctx.currentTime, 0.08);
  }

  private impulse(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
    }
    return buffer;
  }

  /** One tanpura string: rich harmonics, gently swept filter for the jawari buzz, slow re-pluck. */
  private string(ctx: AudioContext, frequency: number, start: number, period: number, level: number): void {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = frequency;
    osc.detune.value = (Math.random() - 0.5) * 6;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 6;
    filter.frequency.value = frequency * 4;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.09 + Math.random() * 0.05;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = frequency * 2.5;
    lfo.connect(lfoDepth).connect(filter.frequency);
    const amp = ctx.createGain();
    amp.gain.value = 0;
    osc.connect(filter).connect(amp).connect(this.master!);

    // Re-pluck on a cycle: quick swell, long decay.
    const cycles = 400;
    for (let i = 0; i < cycles; i++) {
      const t = start + i * period;
      amp.gain.setTargetAtTime(level, t, 0.06);
      amp.gain.setTargetAtTime(level * 0.25, t + 0.3, period * 0.45);
    }
    osc.start(start);
    lfo.start(start);
  }

  private startDrone(): void {
    if (this.droneStarted || !this.ctx) return;
    this.droneStarted = true;
    const now = this.ctx.currentTime + 0.1;
    const period = 4.8;
    // Pa, Sa', Sa', Sa: the classic tanpura cycle, each string offset in time.
    this.string(this.ctx, SA * 0.75, now, period, 0.05);
    this.string(this.ctx, SA, now + period * 0.25, period, 0.045);
    this.string(this.ctx, SA, now + period * 0.5, period, 0.045);
    this.string(this.ctx, SA * 0.5, now + period * 0.75, period, 0.06);
  }

  setEnabled(on: boolean): void {
    if (on) {
      const ctx = this.ensure();
      void ctx.resume();
      this.startDrone();
      this.master!.gain.cancelScheduledValues(ctx.currentTime);
      this.master!.gain.setTargetAtTime(DRONE_LEVEL / 0.11, ctx.currentTime, 1.2);
      this.bell(0.6);
    } else if (this.ctx && this.master) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
    }
  }

  private get active(): boolean {
    return Boolean(this.ctx && getState().soundOn);
  }

  /** A small brass bell: inharmonic partials with long exponential decay. */
  bell(level = 1): void {
    if (!this.active || !this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.02;
    const fundamental = 660;
    const partials: [number, number, number][] = [
      [1, 0.5, 5],
      [2.76, 0.28, 3.4],
      [5.4, 0.14, 2],
      [8.93, 0.07, 1.2],
      [0.5, 0.18, 6],
    ];
    for (const [ratio, gain, decay] of partials) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = fundamental * ratio;
      const amp = ctx.createGain();
      amp.gain.setValueAtTime(0, t);
      amp.gain.linearRampToValueAtTime(gain * 0.17 * level, t + 0.005);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      osc.connect(amp).connect(this.master);
      osc.start(t);
      osc.stop(t + decay + 0.1);
    }
  }

  /** Ignition: a soft hiss of a match, then the bell. */
  ignite(): void {
    if (!this.active || !this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.05;
    const noise = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.8, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, t);
    filter.frequency.exponentialRampToValueAtTime(600, t + 0.7);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(0.05, t + 0.06);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
    noise.connect(filter).connect(amp).connect(this.master);
    noise.start(t);
    window.setTimeout(() => this.bell(0.8), 900);
  }
}

export const audio = new AmbientAudio();

export function useAudio(): { soundOn: boolean; volume: number; toggle: () => void; setVolume: (v: number) => void } {
  const soundOn = useExperience((s) => s.soundOn);
  const volume = useExperience((s) => s.volume);
  const toggle = () => {
    const next = !getState().soundOn;
    setState({ soundOn: next });
    audio.setEnabled(next);
  };
  const setVolume = (value: number) => {
    setState({ volume: value });
    audio.setVolume(value);
  };
  return { soundOn, volume, toggle, setVolume };
}
