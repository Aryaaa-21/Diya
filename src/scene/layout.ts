import { Vector3 } from 'three';

/** Scene units are metres. The main diya sits at the origin, on the rangoli. */

const UP = new Vector3(0, 1, 0);

/** The diya is turned so its spout (and flame) leans toward the camera's right. */
export const SPOUT_YAW = -0.6;

/** Flame base relative to an unrotated, unscaled diya. */
export const FLAME_LOCAL = new Vector3(0.108, 0.052, 0);
export const FLAME_WORLD = FLAME_LOCAL.clone().applyAxisAngle(UP, SPOUT_YAW);

export const RANGOLI_RADIUS = 1.05;

export interface LampPlacement {
  x: number;
  z: number;
  yaw: number;
  scale: number;
  /** Flame position in world space, derived from the placement. */
  flame: Vector3;
}

function place(radius: number, degrees: number, yaw: number, scale: number): LampPlacement {
  const angle = (degrees * Math.PI) / 180;
  const x = radius * Math.sin(angle);
  const z = -radius * Math.cos(angle);
  const flame = FLAME_LOCAL.clone().multiplyScalar(scale).applyAxisAngle(UP, yaw);
  flame.x += x;
  flame.z += z;
  return { x, z, yaw, scale, flame };
}

/**
 * Background diyas, already sorted in ignition order: the inner ring lights first,
 * alternating left and right, then the outer ring. The light appears to spread.
 */
export const LAMPS: LampPlacement[] = [
  place(1.3, -24, 0.4, 0.72),
  place(1.3, 26, 2.6, 0.72),
  place(1.32, -68, -0.9, 0.7),
  place(1.32, 70, 3.4, 0.7),
  place(1.36, -112, 1.2, 0.68),
  place(1.36, 114, 2.0, 0.68),
  place(2.45, -12, 0.2, 0.62),
  place(2.45, 16, 2.9, 0.62),
  place(2.6, -46, -1.4, 0.6),
  place(2.6, 48, 1.7, 0.6),
];

export type ShotName =
  | 'intro'
  | 'close'
  | 'world'
  | 'diya'
  | 'flame'
  | 'rangoli'
  | 'sky'
  | 'celebrate'
  | 'message'
  | 'personal';

/**
 * Where a courtyard piece can be put down: outside the rangoli, inside the
 * light, and inside the frame. The celebrate shot is only 3.5 m wide where the
 * diya stands, so anything further out than this is cropped away.
 */
export const COURTYARD = {
  minRadius: 1.15,
  maxRadius: 5.2,
  maxX: 3,
  minZ: -5,
  maxZ: 0.5,
};

/**
 * Fixed stands used by the show and by "Light one", in firing order.
 *
 * Set well back from the diya: the celebrate camera sits barely half a metre
 * above the floor, so a piece at the diya's own depth lands on the bottom edge
 * of the frame. At three to four metres back a fountain stands up through the
 * middle of the shot instead. Biased slightly left, because on a wide screen
 * the controls occupy the right third.
 */
export const GROUND_SPOTS: readonly [number, number][] = [
  [-1.7, -2.2],
  [1.1, -2.4],
  [-2.4, -3.4],
  [1.9, -3.6],
  [-0.7, -3],
  [0.75, -3.2],
  [0, -4.2],
];

/** Keep a point inside the courtyard: out of the rangoli, in shot. */
export function clampToCourtyard(x: number, z: number): [number, number] {
  let cx = Math.max(-COURTYARD.maxX, Math.min(COURTYARD.maxX, x));
  let cz = Math.max(COURTYARD.minZ, Math.min(COURTYARD.maxZ, z));
  const r = Math.hypot(cx, cz);
  if (r < COURTYARD.minRadius) {
    // Too close to the diya: push it straight out to the edge of the rangoli.
    const k = COURTYARD.minRadius / (r || 1);
    cx *= k;
    cz = r < 1e-3 ? -COURTYARD.minRadius : cz * k;
  } else if (r > COURTYARD.maxRadius) {
    const k = COURTYARD.maxRadius / r;
    cx *= k;
    cz *= k;
  }
  return [cx, cz];
}

export interface Shot {
  position: [number, number, number];
  target: [number, number, number];
}

const F = FLAME_WORLD;

export const SHOTS: Record<ShotName, Shot> = {
  // Opening: slightly further than `close`, so the first move is a slow approach.
  intro: { position: [0.06, 0.16, 0.66], target: [0.03, 0.035, 0.02] },
  close: { position: [0.05, 0.11, 0.44], target: [F.x * 0.6, 0.045, F.z * 0.5] },
  world: { position: [0, 0.95, 2.25], target: [0, 0.32, -0.2] },
  diya: { position: [0.08, 0.34, 1.2], target: [0.03, 0.11, 0] },
  flame: { position: [0.1, 0.1, 0.36], target: [F.x, F.y + 0.02, F.z] },
  rangoli: { position: [0, 2.1, 1.75], target: [0, 0, 0.05] },
  sky: { position: [0, 0.5, 2.8], target: [0, 3.6, -14] },
  /**
   * Celebrate: the courtyard along the bottom of the frame and the whole sky
   * above it. The camera-to-target vector is kept near horizontal on purpose —
   * CameraRig scales that vector to fit narrow screens, and a steep shot would
   * drive the camera under the floor on a phone.
   */
  celebrate: { position: [0, 0.75, 3.2], target: [0, 1.35, -5.5] },
  message: { position: [0, 0.34, 1.35], target: [0.03, -0.1, 0] },
  personal: { position: [0.02, 0.22, 0.92], target: [0.04, 0.14, 0.02] },
};
