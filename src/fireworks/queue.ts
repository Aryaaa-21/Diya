import { Vector3 } from 'three';
import { getState, type FireworkShape } from '../state/store';
import { pickShape } from './shells';
import type { FireworkKind, FireworkRequest } from './types';

/**
 * Ignition requests from anywhere in the app — a tap on the sky, a tap on the
 * courtyard, the choreographed show, the ignition and greeting timelines. The
 * scene drains this queue once per frame, which keeps every caller free of the
 * renderer and of each other.
 */
export const queue: FireworkRequest[] = [];

export function requestFirework(request: FireworkRequest): void {
  // One frame's worth of taps is plenty; anything more is a stuck pointer.
  if (queue.length > 6) return;
  queue.push(request);
}

/** Minimum gap between the ambient sky bursts, so the night never gets busy. */
const AMBIENT_GAP_MS = 1400;
let lastAmbient = -Infinity;

/**
 * The cinematic timelines' sky burst: one shell, far out, at a given point.
 * Kept as its own entry point because ignition, the greeting and ambient mode
 * all want "a firework over there" without knowing anything about pieces.
 */
export function launchFirework(
  position?: Vector3,
  size = 1,
  force = false,
  shape: FireworkShape | 'random' = getState().fireworkShape,
): boolean {
  const now = performance.now();
  if (!force && now - lastAmbient < AMBIENT_GAP_MS) return false;
  lastAmbient = now;
  // Default bursts land to one side, low enough to be seen from the world shot.
  const x = position?.x ?? (Math.random() < 0.5 ? -1 : 1) * (2.5 + Math.random() * 2.5);
  const y = position?.y ?? 1.9 + Math.random() * 1.1;
  const z = position?.z ?? -12 - Math.random() * 3;
  requestFirework({
    kind: 'shell',
    x,
    y,
    z,
    shape: shape === 'random' ? pickShape() : shape,
    scale: 0.6 + size * 0.3,
    force: true,
  });
  return true;
}

/** Celebrate mode: light the armed piece at a point the user picked. */
export function ignitePiece(kind: FireworkKind, x: number, y: number, z: number): void {
  requestFirework({ kind, x, y, z });
}
