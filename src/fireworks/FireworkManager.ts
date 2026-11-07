import { rig } from '../animations/camera';
import { world } from '../animations/world';
import { fireworkAudio } from './audio';
import { anar, chakri, phuljhadi } from './ground';
import { ParticleSystem } from './ParticleSystem';
import { cake, rocket, shell } from './sky';
import type { Stage } from './stage';
import { BUDGETS, type Budget, type FireworkRequest } from './types';
import type { Quality } from '../state/store';

/**
 * Owns the pool, decides what is allowed to light, and drives the two things
 * the rest of the scene borrows from a firework: one shared light and a little
 * camera response.
 *
 * Nothing here runs per particle. The manager's whole per-frame job is to walk
 * a handful of cues (at most a few dozen), which is why several pieces burning
 * at once cost the same as one.
 */

interface LightCue {
  start: number;
  end: number;
  power: number;
  x: number;
  y: number;
  z: number;
}

interface TimedCue {
  at: number;
  /** For rises, when the lift has fully settled back. */
  end: number;
  power: number;
}

/** Shortest gap between two ignitions. Fast enough to feel direct, not spam. */
const MIN_GAP = 0.2;
/** Ceiling on how much a firework may brighten the courtyard. */
const MAX_ILLUMINANCE = 2.5;
/** A kick of 1 moves the camera by this many metres at its worst. */
const KICK_SCALE = 0.013;
/** A full rise lifts the camera's gaze by this much. */
const LIFT_SCALE = 0.26;
/** Beyond this, a burst's light is pulled closer so it still reaches the floor. */
const LIGHT_REACH = 4.5;

export class FireworkManager implements Stage {
  readonly sys: ParticleSystem;
  readonly budget: Budget;
  /** Scene time of the frame being prepared; emitters read this for audio offsets. */
  now = 0;

  /** End times of the pieces currently burning. */
  private readonly effects: number[] = [];
  private readonly lights: LightCue[] = [];
  private readonly kicks: TimedCue[] = [];
  private readonly rises: TimedCue[] = [];
  private lastIgnition = -Infinity;
  private shake = 0;

  /** Read by the scene each frame to place and brighten the shared light. */
  readonly lightState = { intensity: 0, x: 0, y: 1, z: -6 };

  constructor(quality: Quality) {
    this.budget = BUDGETS[quality];
    this.sys = new ParticleSystem(this.budget.particles);
    fireworkAudio.setCap(this.budget.voices);
  }

  light(start: number, end: number, power: number, x: number, y: number, z: number): void {
    this.lights.push({ start, end, power, x, y, z });
  }

  kick(at: number, power: number): void {
    this.kicks.push({ at, end: at, power });
  }

  rise(at: number, duration: number, power: number): void {
    // A big shell asks for more than 1; the gaze lift is capped either way.
    this.rises.push({ at, end: at + duration, power: Math.min(1, power) });
  }

  /** How many pieces are burning right now. */
  get active(): number {
    return this.effects.length;
  }

  /**
   * Light a piece. Returns false when it was too soon after the last one.
   *
   * At the effect ceiling the oldest entry is retired rather than the request
   * refused: the brief asks for the newest effect to win, and the particle pool
   * already bounds the real cost by recycling its oldest slots.
   */
  ignite(request: FireworkRequest): boolean {
    const { kind, x, y, z, shape, scale, palette, force } = request;
    if (!force && this.now - this.lastIgnition < MIN_GAP) return false;
    this.lastIgnition = this.now;
    if (this.effects.length >= this.budget.effects) this.effects.shift();

    let duration = 0;
    switch (kind) {
      case 'anar':
        duration = anar(this, this.now, x, z);
        break;
      case 'chakri':
        duration = chakri(this, this.now, x, z);
        break;
      case 'phuljhadi':
        duration = phuljhadi(this, this.now, x, z);
        break;
      case 'rocket':
        duration = rocket(this, this.now, x, y, z, scale);
        break;
      case 'shell':
        duration = shell(this, this.now, x, y, z, shape, scale, palette);
        break;
      case 'cake':
        duration = cake(this, this.now, x, z);
        break;
    }
    this.effects.push(this.now + duration);
    return true;
  }

  /**
   * Per-frame: retire what has finished, then resolve the cues into one light
   * position, one intensity, and the camera's shake and lift.
   */
  frame(now: number, dt: number, proj: number, fade: number): void {
    this.now = now;
    for (let i = this.effects.length - 1; i >= 0; i--) {
      if (this.effects[i] <= now) this.effects.splice(i, 1);
    }

    // The light: sum what every live cue contributes, and follow the strongest.
    let illuminance = 0;
    let bestPower = 0;
    let bx = this.lightState.x;
    let by = this.lightState.y;
    let bz = this.lightState.z;
    for (let i = this.lights.length - 1; i >= 0; i--) {
      const cue = this.lights[i];
      if (cue.end <= now) {
        this.lights.splice(i, 1);
        continue;
      }
      if (cue.start > now) continue;
      const span = Math.max(0.001, cue.end - cue.start);
      const u = (now - cue.start) / span;
      // A short cue reads as a flash; a long one swells and settles like a burn.
      const envelope =
        span < 0.8
          ? Math.exp(-u * 4.5) * (1 - u)
          : Math.min(1, u / 0.12) * (1 - Math.max(0, (u - 0.75) / 0.25)) * (0.86 + 0.14 * Math.sin(now * 23 + cue.x * 7));
      const contribution = cue.power * envelope;
      if (contribution <= 0) continue;
      illuminance += contribution;
      if (contribution > bestPower) {
        bestPower = contribution;
        bx = cue.x;
        by = cue.y;
        bz = cue.z;
      }
    }

    if (illuminance > 0) {
      illuminance = Math.min(MAX_ILLUMINANCE, illuminance);
      // A burst 14 m away would barely touch the floor with physical falloff, so
      // its light is pulled in to LIGHT_REACH and re-scaled to keep the same
      // illuminance here. Deliberate cheat: the brief wants a glow, not photons.
      const length = Math.hypot(bx, by, bz) || 1;
      const d = Math.min(length, LIGHT_REACH);
      const k = d / length;
      this.lightState.x = bx * k;
      this.lightState.y = by * k;
      this.lightState.z = bz * k;
      this.lightState.intensity = illuminance * d * d;
    } else {
      this.lightState.intensity = 0;
    }

    // Camera: kicks decay, so several bursts in a row never stack into a quake.
    for (let i = this.kicks.length - 1; i >= 0; i--) {
      if (this.kicks[i].at <= now) {
        this.shake = Math.min(1, this.shake + this.kicks[i].power);
        this.kicks.splice(i, 1);
      }
    }
    this.shake *= Math.exp(-dt * 5.5);
    if (this.shake < 0.002) this.shake = 0;
    // Reduced motion removes the shake outright rather than scaling it down;
    // the gaze lift stays, damped, because it reads as a slow pan.
    const amount = world.motion < 1 ? 0 : this.shake * KICK_SCALE;
    rig.shake.set(Math.sin(now * 37.1) * amount, Math.sin(now * 28.7 + 1.7) * amount * 0.7, 0);

    let lift = 0;
    for (let i = this.rises.length - 1; i >= 0; i--) {
      const cue = this.rises[i];
      const settled = cue.end + 0.9;
      if (settled <= now) {
        this.rises.splice(i, 1);
        continue;
      }
      if (cue.at > now) continue;
      const span = Math.max(0.001, cue.end - cue.at);
      // Follow it up, hold at the break, then come back down.
      const u = (now - cue.at) / span;
      const envelope = u < 1 ? Math.sin(Math.min(1, u) * Math.PI * 0.5) : Math.max(0, 1 - (now - cue.end) / 0.9);
      lift = Math.max(lift, cue.power * envelope);
    }
    rig.lift = lift * LIFT_SCALE * world.motion;

    this.sys.frame(now, proj, fade);
  }

  /** Leaving the mode: stop everything without waiting for it to burn out. */
  clear(): void {
    this.sys.clear();
    this.effects.length = 0;
    this.lights.length = 0;
    this.kicks.length = 0;
    this.rises.length = 0;
    this.shake = 0;
    this.lightState.intensity = 0;
    rig.shake.set(0, 0, 0);
    rig.lift = 0;
  }

  dispose(): void {
    this.clear();
    this.sys.dispose();
  }
}
