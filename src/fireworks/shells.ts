import { Vector3 } from 'three';
import type { FireworkShape } from '../state/store';
import type { PaletteName } from './types';

/**
 * Shell types. Each one owns the burst geometry (written on the CPU into the
 * velocity buffer) plus the handful of physics numbers the vertex shader reads
 * per particle: drag, gravity, lifetime and sprite scale. Nothing here changes
 * the palette rule for the piece — every spec stays inside gold, warm orange,
 * deep red and soft cream.
 */
export interface ShapeSpec {
  /** Shown in the sky panel. */
  label: string;
  /** Exponential drag on the outward velocity; high values stop sparks fast. */
  drag: number;
  /** Downward pull, in units per second squared. */
  gravity: number;
  /** Multiplier on the base spark lifetime. */
  life: number;
  /** Multiplier on sprite size. */
  size: number;
  /** Multiplier on burst radius. */
  speed: number;
  /** Multiplier on particle count: curves need fewer sparks than spheres. */
  density: number;
  /** Which palettes this shell draws from. */
  palettes: readonly PaletteName[];
  /** 0 = rising head, 1 = steady spark, 2 = twinkling spark. */
  kind(i: number): number;
  /** Writes the outward velocity of spark `i` into `out`. */
  velocity(i: number, count: number, speed: number, out: Vector3): void;
}

const TAU = Math.PI * 2;
/** Fibonacci increment: successive points land in an even spiral, not a seam. */
const GOLDEN = Math.PI * (1 + Math.sqrt(5));

/** Even distribution over a sphere, slightly squashed in z and optionally lifted. */
function sphere(i: number, count: number, speed: number, out: Vector3, spread = 0.22, lift = 0) {
  const k = (i + 0.5) / count;
  const phi = Math.acos(1 - 2 * k);
  const theta = GOLDEN * i;
  const s = speed * (1 - spread + Math.random() * spread * 2);
  out.set(
    Math.sin(phi) * Math.cos(theta) * s,
    Math.cos(phi) * s + lift * speed,
    Math.sin(phi) * Math.sin(theta) * s * 0.85,
  );
}

const PALM_ARMS = 9;
/** Heart tilt, so the outline reads as a heart from the sky camera rather than edge-on. */
const HEART_SKEW = 0.18;

export const SHAPES: Record<FireworkShape, ShapeSpec> = {
  bloom: {
    label: 'Bloom',
    drag: 1.35,
    gravity: 0.32,
    life: 1,
    size: 1,
    speed: 1,
    density: 1,
    palettes: ['gold', 'amber', 'ember', 'cream'],
    kind: (i) => (i % 5 === 0 ? 2 : 1),
    velocity: (i, count, speed, out) => sphere(i, count, speed, out),
  },
  peony: {
    // A tight, even shell that stops almost where it opens: one clean flash.
    label: 'Peony',
    drag: 2.5,
    gravity: 0.22,
    life: 0.78,
    size: 1.15,
    speed: 1.6,
    density: 1,
    palettes: ['gold', 'cream', 'marigold'],
    kind: () => 1,
    velocity: (i, count, speed, out) => sphere(i, count, speed, out, 0.06),
  },
  willow: {
    // Low drag plus heavy gravity plus a long life: sparks sail out, then droop.
    label: 'Willow',
    drag: 0.8,
    gravity: 0.34,
    life: 1.45,
    size: 1.1,
    speed: 0.62,
    density: 0.9,
    palettes: ['amber', 'marigold', 'gold'],
    kind: (i) => (i % 9 === 0 ? 2 : 1),
    velocity: (i, count, speed, out) => sphere(i, count, speed, out, 0.2, 0.22),
  },
  palm: {
    // A few thick fronds: one direction per arm, sparks spaced along it.
    label: 'Palm',
    drag: 0.75,
    gravity: 0.36,
    life: 1.35,
    size: 1.2,
    speed: 0.72,
    density: 0.72,
    palettes: ['amber', 'ember', 'marigold'],
    kind: (i) => (i % 11 === 0 ? 2 : 1),
    velocity: (i, count, speed, out) => {
      const arm = i % PALM_ARMS;
      const perArm = Math.max(1, Math.ceil(count / PALM_ARMS));
      const along = (Math.floor(i / PALM_ARMS) + 0.5) / perArm;
      const angle = (arm / PALM_ARMS) * TAU + 0.3;
      // Tilt is per arm, not per spark, so each frond stays a single line.
      const tilt = 0.62 + 0.26 * Math.sin(arm * 2.3);
      const s = speed * (0.3 + 0.8 * along) * (0.97 + Math.random() * 0.06);
      out.set(Math.cos(angle) * s * 0.9, s * tilt + speed * 0.22, Math.sin(angle) * s * 0.7);
    },
  },
  ring: {
    label: 'Ring',
    drag: 1.6,
    gravity: 0.24,
    life: 1,
    size: 1.1,
    speed: 1.2,
    density: 0.7,
    palettes: ['cream', 'gold', 'white'],
    kind: (i) => (i % 8 === 0 ? 2 : 1),
    velocity: (i, count, speed, out) => {
      // Every ninth spark stays near the centre, so the ring keeps a soft core.
      if (i % 9 === 0) {
        sphere(i, count, speed * 0.22, out, 0.4);
        return;
      }
      const angle = (i / count) * TAU;
      const s = speed * (0.96 + Math.random() * 0.07);
      // A circle tilted about x, which projects to the ellipse a real ring reads as.
      out.set(Math.cos(angle) * s, Math.sin(angle) * s * 0.88, Math.sin(angle) * s * 0.47);
    },
  },
  crackle: {
    // Short, dense, all-twinkling: the salute that fizzes rather than blooms.
    label: 'Crackle',
    drag: 3.4,
    gravity: 0.3,
    life: 0.85,
    size: 0.9,
    speed: 1.0,
    density: 1,
    palettes: ['white', 'cream'],
    kind: () => 2,
    velocity: (_i, _count, speed, out) => {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * TAU;
      const s = speed * (0.35 + Math.random() * 0.75);
      out.set(Math.sin(phi) * Math.cos(theta) * s, Math.cos(phi) * s, Math.sin(phi) * Math.sin(theta) * s);
    },
  },
  heart: {
    // High drag and little gravity: the outline holds long enough to be read.
    label: 'Heart',
    drag: 2.6,
    gravity: 0.16,
    life: 1.15,
    size: 1.05,
    speed: 1.5,
    density: 0.78,
    palettes: ['sindoor', 'ember'],
    kind: (i) => (i % 7 === 0 ? 2 : 1),
    velocity: (i, count, speed, out) => {
      const t = (i / count) * TAU;
      const sin = Math.sin(t);
      const hx = 16 * sin * sin * sin;
      const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      const s = (speed / 15) * (0.97 + Math.random() * 0.06);
      out.set(hx * s, hy * s, hx * s * HEART_SKEW + (Math.random() - 0.5) * speed * 0.1);
    },
  },
};

/** Order shown in the sky panel. */
export const SHAPE_ORDER: readonly FireworkShape[] = ['bloom', 'peony', 'willow', 'palm', 'ring', 'crackle', 'heart'];

export function pickShape(): FireworkShape {
  return SHAPE_ORDER[Math.floor(Math.random() * SHAPE_ORDER.length)];
}
