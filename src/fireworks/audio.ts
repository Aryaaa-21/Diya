import { audio } from '../hooks/useAudio';

/**
 * Firecracker sound, synthesised. Nothing is downloaded and nothing is
 * licensed: every bang, hiss, whirr and rumble here is filtered noise and a
 * couple of oscillators, built on the same AudioContext as the ambient drone.
 *
 * That choice answers most of the audio-performance brief by construction —
 * there are no files to compress, lazy-load or pool. What does need managing is
 * concurrency, so every voice is booked through `claim`, which keeps a hard cap
 * on how many sounds can overlap and a floor on the gap between bangs.
 *
 * Everything is scheduled on the audio clock, ahead of time, which is why a
 * cake's five bangs land exactly with their five bursts without a single timer.
 */

/** One noise buffer, made once, shared by every voice that needs noise. */
let noiseBuffer: AudioBuffer | null = null;

function noise(ctx: AudioContext): AudioBufferSourceNode {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
    const length = Math.floor(ctx.sampleRate * 2);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffer = buffer;
  }
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;
  return source;
}

/**
 * An amplitude curve of random spikes: the sound of many small things catching
 * fire at once. One gain node per voice instead of one node per crackle.
 */
function crackle(seconds: number, density: number, peak: number): Float32Array {
  const steps = Math.max(8, Math.floor(seconds * 90));
  const curve = new Float32Array(steps);
  for (let i = 0; i < steps; i++) {
    const u = i / (steps - 1);
    // Fade in and out so a loop never clicks at either end.
    const edge = Math.min(1, u * 12) * Math.min(1, (1 - u) * 6);
    curve[i] = (Math.random() < density ? Math.random() * peak : Math.random() * peak * 0.12) * edge;
  }
  return curve;
}

class FireworkAudio {
  /** End times of voices currently booked, pruned as they finish. */
  private readonly voices: number[] = [];
  /** Continuous voices (fountains, wheels, sparklers) are capped harder. */
  private sustained = 0;
  private lastBang = -1;
  private cap = 8;

  setCap(voices: number): void {
    this.cap = voices;
  }

  /**
   * Book a voice. Returns the context and bus, or null when sound is off or the
   * concurrency limit would be exceeded — the caller simply stays silent.
   */
  private claim(duration: number, sustainedVoice = false): { ctx: AudioContext; bus: GainNode; at: number } | null {
    const bus = audio.fireworkBus();
    if (!bus) return null;
    const { ctx, node } = bus;
    const now = ctx.currentTime;
    for (let i = this.voices.length - 1; i >= 0; i--) {
      if (this.voices[i] <= now) this.voices.splice(i, 1);
    }
    if (this.voices.length >= this.cap) return null;
    if (sustainedVoice) {
      if (this.sustained >= 3) return null;
      this.sustained += 1;
      window.setTimeout(() => {
        this.sustained = Math.max(0, this.sustained - 1);
      }, duration * 1000);
    }
    this.voices.push(now + duration);
    return { ctx, bus: node, at: now };
  }

  /** A filtered noise voice with an explicit amplitude curve. */
  private noiseVoice(
    ctx: AudioContext,
    bus: GainNode,
    start: number,
    duration: number,
    type: BiquadFilterType,
    from: number,
    to: number,
    curve: Float32Array,
    q = 1,
  ): void {
    const source = noise(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), start + duration);
    const amp = ctx.createGain();
    // The curve owns the whole window. Scheduling anything else at `start` can
    // throw NotSupportedError for overlapping automation, so the curve's own
    // first value is the attack: gentle for a hiss, instant for a crack.
    amp.gain.setValueCurveAtTime(curve, start, duration);
    source.connect(filter).connect(amp).connect(bus);
    source.start(start, Math.random() * 1.5);
    source.stop(start + duration + 0.05);
  }

  /** Anar: the catch, then a swelling fountain of crackle. */
  anar(delay: number, fuse: number, burn: number): void {
    const voice = this.claim(delay + fuse + burn + 0.4, true);
    if (!voice) return;
    const { ctx, bus, at } = voice;
    const t = at + Math.max(0, delay);
    // Ignition: a short, bright hiss.
    this.noiseVoice(ctx, bus, t, fuse + 0.2, 'bandpass', 2600, 900, crackle(fuse + 0.2, 0.7, 0.1), 1.2);
    // The fountain, swelling and then falling away.
    const steps = Math.max(16, Math.floor(burn * 40));
    const body = new Float32Array(steps);
    for (let i = 0; i < steps; i++) {
      const u = i / (steps - 1);
      const swell = Math.min(1, u / 0.16) * (u < 0.7 ? 1 : Math.max(0, 1 - (u - 0.7) / 0.3));
      body[i] = (0.075 + Math.random() * 0.07) * swell;
    }
    this.noiseVoice(ctx, bus, t + fuse, burn, 'bandpass', 1100, 700, body, 0.8);
    this.noiseVoice(ctx, bus, t + fuse, burn, 'highpass', 3200, 2200, crackle(burn, 0.5, 0.075));
  }

  /** Chakri: a whirr that spins up and down, with sparks on top. */
  chakri(delay: number, fuse: number, burn: number): void {
    const voice = this.claim(delay + fuse + burn + 0.4, true);
    if (!voice) return;
    const { ctx, bus, at } = voice;
    const t = at + Math.max(0, delay);
    this.noiseVoice(ctx, bus, t, fuse + 0.15, 'bandpass', 2400, 1200, crackle(fuse + 0.15, 0.6, 0.08), 1.2);

    const start = t + fuse;
    const source = noise(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 3.5;
    // Pitch tracks the wheel: up fast, hold, then down as it loses speed.
    filter.frequency.setValueAtTime(320, start);
    filter.frequency.linearRampToValueAtTime(1150, start + burn * 0.16);
    filter.frequency.setValueAtTime(1150, start + burn * 0.68);
    filter.frequency.linearRampToValueAtTime(260, start + burn);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, start);
    amp.gain.linearRampToValueAtTime(0.11, start + 0.25);
    amp.gain.setValueAtTime(0.11, start + burn * 0.68);
    amp.gain.linearRampToValueAtTime(0, start + burn);
    // One flutter per revolution: ~2.7 turns a second at full speed.
    const flutter = ctx.createOscillator();
    flutter.frequency.setValueAtTime(0.8, start);
    flutter.frequency.linearRampToValueAtTime(2.7, start + burn * 0.16);
    flutter.frequency.linearRampToValueAtTime(0.6, start + burn);
    const flutterDepth = ctx.createGain();
    flutterDepth.gain.value = 0.03;
    flutter.connect(flutterDepth).connect(amp.gain);
    source.connect(filter).connect(amp).connect(bus);
    source.start(start, Math.random());
    flutter.start(start);
    source.stop(start + burn + 0.05);
    flutter.stop(start + burn + 0.05);

    this.noiseVoice(ctx, bus, start, burn, 'highpass', 3000, 2000, crackle(burn, 0.45, 0.068));
  }

  /** Phuljhadi: fine, quiet, continuous fizz. */
  phuljhadi(delay: number, fuse: number, burn: number): void {
    const voice = this.claim(delay + fuse + burn + 0.3, true);
    if (!voice) return;
    const { ctx, bus, at } = voice;
    const t = at + Math.max(0, delay) + fuse;
    this.noiseVoice(ctx, bus, t, burn, 'highpass', 4200, 3600, crackle(burn, 0.75, 0.055));
    this.noiseVoice(ctx, bus, t, burn, 'bandpass', 2000, 1800, crackle(burn, 0.3, 0.032), 2);
  }

  /** Fuse, then the whoosh of something leaving the ground. */
  launch(delay: number, fuse: number, rise: number): void {
    const voice = this.claim(delay + fuse + rise + 0.2);
    if (!voice) return;
    const { ctx, bus, at } = voice;
    const t = at + Math.max(0, delay);
    this.noiseVoice(ctx, bus, t, fuse, 'bandpass', 2800, 1400, crackle(fuse, 0.6, 0.07), 1.5);

    const start = t + fuse;
    const steps = Math.max(12, Math.floor(rise * 50));
    const swoosh = new Float32Array(steps);
    for (let i = 0; i < steps; i++) {
      const u = i / (steps - 1);
      // Loudest just after it leaves, thinning as it climbs away.
      swoosh[i] = 0.1 * Math.min(1, u * 8) * (1 - u * 0.75) * (0.85 + Math.random() * 0.3);
    }
    this.noiseVoice(ctx, bus, start, rise, 'bandpass', 420, 1500, swoosh, 1.1);
  }

  /**
   * The break. A crack, a body thump and a long rumble, pitched and stretched by
   * the size of the shell and thinned by how far away it is.
   */
  boom(delay: number, scale: number, distance: number): void {
    const bus = audio.fireworkBus();
    if (!bus) return;
    const now = bus.ctx.currentTime;
    const at = now + Math.max(0, delay);
    // Never let two bangs land on top of each other.
    if (at - this.lastBang < 0.07) return;
    const tail = 0.8 + scale * 0.9;
    const voice = this.claim(delay + tail + 0.2);
    if (!voice) return;
    this.lastBang = at;
    const { ctx } = voice;
    const node = voice.bus;
    const far = Math.min(1, Math.max(0.35, 14 / Math.max(4, distance)));
    const level = 0.82 * far * (0.7 + scale * 0.5);

    // The crack: a very short, bright transient.
    const crack = new Float32Array(10);
    for (let i = 0; i < 10; i++) crack[i] = Math.pow(1 - i / 9, 2.5) * 0.52 * level;
    this.noiseVoice(ctx, node, at, 0.09, 'highpass', 1800, 900, crack);

    // The body: a low thump that drops in pitch as it decays.
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    const base = 96 / (0.8 + scale * 0.6);
    osc.frequency.setValueAtTime(base, at);
    osc.frequency.exponentialRampToValueAtTime(base * 0.45, at + 0.35);
    const thump = ctx.createGain();
    thump.gain.setValueAtTime(0, at);
    thump.gain.linearRampToValueAtTime(0.72 * level, at + 0.012);
    thump.gain.exponentialRampToValueAtTime(0.0001, at + 0.45 + scale * 0.2);
    osc.connect(thump).connect(node);
    osc.start(at);
    osc.stop(at + 0.7 + scale * 0.3);

    // The rumble rolling back off the rooftops.
    const steps = Math.floor(tail * 60);
    const rumble = new Float32Array(steps);
    for (let i = 0; i < steps; i++) {
      const u = i / (steps - 1);
      rumble[i] = Math.pow(1 - u, 2.2) * 0.3 * level * (0.8 + Math.random() * 0.4);
    }
    this.noiseVoice(ctx, node, at + 0.02, tail, 'lowpass', 900, 160, rumble, 0.7);

    // Crackling debris, only for the big ones.
    if (scale > 1) {
      this.noiseVoice(ctx, node, at + 0.1, 1.1, 'highpass', 3400, 2400, crackle(1.1, 0.35, 0.085 * far));
    }
  }
}

export const fireworkAudio = new FireworkAudio();
