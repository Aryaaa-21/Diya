import { BufferAttribute, BufferGeometry, CatmullRomCurve3, CircleGeometry, LatheGeometry, TubeGeometry, Vector2, Vector3 } from 'three';
import { FLAME_LOCAL } from '../../scene/layout';

/**
 * A hand-pinched clay diya, built procedurally so it costs no download.
 * Profile is (radius, height) in metres, outside wall to inside floor.
 */
const PROFILE: [number, number][] = [
  [0.0, 0.0],
  [0.028, 0.0],
  [0.032, 0.003],
  [0.031, 0.006],
  [0.046, 0.009],
  [0.062, 0.016],
  [0.074, 0.026],
  [0.081, 0.036],
  [0.084, 0.0425],
  [0.081, 0.0462],
  [0.076, 0.0448],
  [0.07, 0.036],
  [0.058, 0.025],
  [0.038, 0.0185],
  [0.0, 0.0165],
];

const RIM_HEIGHT = 0.046;
/** How far the rim is pulled out to form the spout, as a fraction of radius. */
const SPOUT_REACH = 0.36;
const SPOUT_LIFT = 0.007;

/** Spout weight for a direction: 1 straight along +x, falling off quickly to the sides. */
function spoutWeight(x: number, z: number): number {
  const c = Math.max(0, x / Math.hypot(x, z || 1e-6));
  return Math.pow(c, 7);
}

function deform(p: Vector3): void {
  if (Math.hypot(p.x, p.z) < 1e-5) return;
  const w = spoutWeight(p.x, p.z);
  const h = Math.min(1, Math.max(0, p.y / RIM_HEIGHT));
  const pull = 1 + w * SPOUT_REACH * Math.pow(h, 1.6);
  p.x *= pull;
  p.z *= 1 - w * 0.25 * h; // pinch the spout's sides
  p.y += w * SPOUT_LIFT * h * h;
}

/** Tiny deterministic wobble so the rim isn't machine-perfect. */
function handMade(p: Vector3, angle: number): void {
  const h = Math.min(1, p.y / RIM_HEIGHT);
  const wobble = (Math.sin(angle * 3 + 0.7) * 0.6 + Math.sin(angle * 7 + 2.1) * 0.4) * 0.0009 * h;
  const r = Math.hypot(p.x, p.z);
  if (r < 1e-5) return;
  p.x += (p.x / r) * wobble;
  p.z += (p.z / r) * wobble;
  p.y += Math.sin(angle * 5 + 1.3) * 0.0006 * h * h;
}

export function createDiyaBody(segments: number): BufferGeometry {
  const geometry = new LatheGeometry(
    PROFILE.map(([r, y]) => new Vector2(r, y)),
    segments,
  );
  const pos = geometry.attributes.position as BufferAttribute;
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const angle = Math.atan2(v.z, v.x);
    handMade(v, angle);
    deform(v);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  weldSeamNormals(geometry, segments, PROFILE.length);
  return geometry;
}

/** LatheGeometry duplicates the first column at the seam; average its normals so there's no crease. */
function weldSeamNormals(geometry: BufferGeometry, segments: number, rows: number): void {
  const normals = geometry.attributes.normal as BufferAttribute;
  const a = new Vector3();
  const b = new Vector3();
  for (let j = 0; j < rows; j++) {
    const first = j;
    const last = segments * rows + j;
    a.fromBufferAttribute(normals, first);
    b.fromBufferAttribute(normals, last);
    a.add(b).normalize();
    normals.setXYZ(first, a.x, a.y, a.z);
    normals.setXYZ(last, a.x, a.y, a.z);
  }
}

export const OIL_HEIGHT = 0.03;

/** The ghee surface: a disc that follows the bowl's inner wall, spout included. */
export function createOilSurface(segments: number): BufferGeometry {
  const geometry = new CircleGeometry(0.0688, segments);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, OIL_HEIGHT, 0);
  const pos = geometry.attributes.position as BufferAttribute;
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    deform(v);
    pos.setXYZ(i, v.x, OIL_HEIGHT, v.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Twisted cotton wick lying in the spout, its tip raised to where the flame sits. */
export function createWick(): BufferGeometry {
  const tip = FLAME_LOCAL;
  const curve = new CatmullRomCurve3([
    new Vector3(0.035, OIL_HEIGHT - 0.003, 0.004),
    new Vector3(0.062, OIL_HEIGHT + 0.0005, 0.001),
    new Vector3(0.088, OIL_HEIGHT + 0.006, 0),
    new Vector3(tip.x - 0.004, tip.y - 0.006, 0),
    new Vector3(tip.x, tip.y - 0.0015, 0),
  ]);
  return new TubeGeometry(curve, 24, 0.0021, 8, false);
}
