import { PALETTES, type Budget, type PaletteName } from './types';
import type { ParticleSystem } from './ParticleSystem';

/**
 * What an emitter is allowed to touch: the particle pool, the quality budget,
 * and three cues the scene answers to (a light, a camera nudge, a camera lift).
 * Emitters never reach for the store, the camera or the renderer directly.
 */
export interface Stage {
  sys: ParticleSystem;
  budget: Budget;
  /** Scene time of the frame doing the igniting; audio offsets are measured from it. */
  readonly now: number;
  /**
   * Hold a warm light at a point between two absolute times. A flash is just a
   * short cue; a fountain is a long one. The scene sums whatever is current.
   */
  light(start: number, end: number, power: number, x: number, y: number, z: number): void;
  /** A tiny, decaying camera response. Power 0..1; reduced motion ignores it. */
  kick(at: number, power: number): void;
  /** Lift the camera's gaze while something climbs, then let it settle. */
  rise(at: number, duration: number, power: number): void;
}

export const rand = (a: number, b: number): number => a + Math.random() * (b - a);

/** Pick one entry at random. */
export function choose<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Colour `i` of a palette, cycling. Emitters walk this so a burst reads as one family. */
export function paletteColor(name: PaletteName, i: number): string {
  const palette = PALETTES[name];
  return palette[i % palette.length];
}

/** Scale a particle count by the quality tier, keeping at least a usable handful. */
export function scaled(count: number, budget: Budget, min = 6): number {
  return Math.max(min, Math.round(count * budget.density));
}

/**
 * Closed-form height of something launched straight up under the shader's own
 * motion model, so a trail written on the CPU sits exactly on the path the GPU
 * will draw for the head.
 */
export function pathAt(v: number, drag: number, gravity: number, t: number): number {
  return (v * (1 - Math.exp(-drag * t))) / drag - gravity * t * t;
}

/** The launch velocity that puts a particle at `distance` after `t` seconds. */
export function velocityFor(distance: number, drag: number, gravity: number, t: number): number {
  const k = (1 - Math.exp(-drag * t)) / drag;
  return (distance + gravity * t * t) / k;
}
