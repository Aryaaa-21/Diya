import { Vector2, Vector3 } from 'three';
import { LAMPS } from '../scene/layout';

/**
 * Values that GSAP timelines write and the render loop reads every frame.
 * Living outside React means cinematic tweens never cause a re-render.
 * All values are normalised 0..1 unless noted.
 */
export const world = {
  /** The unlit diya emerging from darkness. */
  intro: 0,
  wick: 0,
  spark: 0,
  flame: 0,
  light: 0,
  /** Radius of the warm pool on the floor, 0..1 of its final reach. */
  floorGlow: 0,
  rangoli: 0,
  particles: 0,
  /** The hero flame stretching upward as its light lifts off. */
  lift: 0,
  /** Progress of the light rising from the flame into the night, 0..1. */
  ascend: 0,
  environment: 0,
  /** User glow multiplier (Diya mode). */
  glow: 1,
  /** Extra brightness while a personal greeting is shown. */
  boost: 0,
  /** 1 normally, lower when the user prefers reduced motion. */
  motion: 1,
};

/** Ignition level of each background lamp, in LAMPS order. */
export const lampLevels = LAMPS.map(() => ({ value: 0 }));

/** Pointer data shared between the canvas and the DOM cursor. */
export const pointer = {
  /** Where the pointer ray meets the floor, far away when unknown. */
  floor: new Vector3(1e3, 0, 1e3),
  /** Main flame position in CSS pixels. */
  flameScreen: new Vector2(-1e3, -1e3),
  /** Smoothed horizontal pointer velocity, used to lean the flame. */
  sway: 0,
  /** Set by pointer events, cleared by the frame that consumes them. */
  moved: false,
  /** The pointer is over something in the scene that a tap would open. */
  hotspot: false,
};
