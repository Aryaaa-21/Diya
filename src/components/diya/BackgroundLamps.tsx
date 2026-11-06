import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  Euler,
  InstancedBufferAttribute,
  Matrix4,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type InstancedMesh,
} from 'three';
import { lampLevels, pointer, world } from '../../animations/world';
import { LAMPS } from '../../scene/layout';
import { createGlowMaterial, getGlowGeometry } from '../../scene/shaders/glowMaterial';
import type { Quality } from '../../state/store';
import { flicker } from '../../utils/flicker';
import { createDiyaBody, createOilSurface, createWick } from './diyaGeometry';
import { getDiyaMaterials } from './diyaMaterials';
import { createFlameMaterial, getFlameGeometry } from './flameMaterial';

const COUNT: Record<Quality, number> = { high: 10, medium: 8, low: 6 };
/** Background lamps are less detailed than the hero: fewer lathe segments. */
const SEGMENTS: Record<Quality, number> = { high: 40, medium: 32, low: 24 };
const PROXIMITY_RADIUS = 0.45;

function addLevelAttribute(geometry: BufferGeometry, count: number, phases?: number[]): InstancedBufferAttribute {
  const level = new InstancedBufferAttribute(new Float32Array(count), 1);
  geometry.setAttribute('aLevel', level);
  if (phases) geometry.setAttribute('aPhase', new InstancedBufferAttribute(new Float32Array(phases), 1));
  return level;
}

/**
 * Six to ten dimmer, smaller lamps around the rangoli. Every part is one
 * InstancedMesh, so the whole ring costs seven draw calls.
 */
export function BackgroundLamps({ quality }: { quality: Quality }) {
  const count = COUNT[quality];
  const lamps = LAMPS.slice(0, count);
  const materials = getDiyaMaterials();
  const segments = SEGMENTS[quality];

  const geometries = useMemo(() => {
    const phases = lamps.map((_, i) => (i * 0.6180339) % 1);
    const flame = getFlameGeometry().clone();
    const halo = getGlowGeometry('sphere').clone();
    const pool = getGlowGeometry('floor').clone();
    const shadow = getGlowGeometry('floor').clone();
    return {
      body: createDiyaBody(segments),
      oil: createOilSurface(segments),
      wick: createWick(),
      flame,
      halo,
      pool,
      shadow,
      flameLevel: addLevelAttribute(flame, count, phases),
      haloLevel: addLevelAttribute(halo, count),
      poolLevel: addLevelAttribute(pool, count),
      shadowLevel: addLevelAttribute(shadow, count),
    };
    // `lamps` is derived from `count`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, segments]);

  const flameMaterial = useMemo(createFlameMaterial, []);
  const haloMaterial = useMemo(() => createGlowMaterial('sphere', '#ff8a1f', 0.4, 18), []);
  const poolMaterial = useMemo(() => createGlowMaterial('floor', '#ff7a18', 0.2, 10), []);
  const shadowMaterial = useMemo(() => createGlowMaterial('shadow', '#020001', 0.75, 3), []);

  const bodyRef = useRef<InstancedMesh>(null);
  const oilRef = useRef<InstancedMesh>(null);
  const wickRef = useRef<InstancedMesh>(null);
  const flameRef = useRef<InstancedMesh>(null);
  const haloRef = useRef<InstancedMesh>(null);
  const poolRef = useRef<InstancedMesh>(null);
  const shadowRef = useRef<InstancedMesh>(null);
  const proximity = useRef<number[]>(lamps.map(() => 0));

  useLayoutEffect(() => {
    const m = new Matrix4();
    const q = new Quaternion();
    const s = new Vector3();
    const p = new Vector3();
    const e = new Euler();
    lamps.forEach((lamp, i) => {
      q.setFromEuler(e.set(0, lamp.yaw, 0));
      s.setScalar(lamp.scale);
      p.set(lamp.x, 0, lamp.z);
      m.compose(p, q, s);
      bodyRef.current?.setMatrixAt(i, m);
      oilRef.current?.setMatrixAt(i, m);
      wickRef.current?.setMatrixAt(i, m);

      q.identity();
      flameRef.current?.setMatrixAt(i, m.compose(lamp.flame, q, s));
      p.set(lamp.flame.x, lamp.flame.y + 0.016 * lamp.scale, lamp.flame.z);
      haloRef.current?.setMatrixAt(i, m.compose(p, q, s.setScalar(0.13 * lamp.scale)));
      p.set(lamp.x, 0.0012, lamp.z);
      poolRef.current?.setMatrixAt(i, m.compose(p, q, s.setScalar(1.25 * lamp.scale)));
      p.set(lamp.x, 0.0007, lamp.z);
      shadowRef.current?.setMatrixAt(i, m.compose(p, q, s.setScalar(0.19 * lamp.scale)));
    });
    for (const ref of [bodyRef, oilRef, wickRef, flameRef, haloRef, poolRef, shadowRef]) {
      if (!ref.current) continue;
      ref.current.instanceMatrix.needsUpdate = true;
      ref.current.computeBoundingSphere();
    }
    geometries.shadowLevel.array.fill(1);
    geometries.shadowLevel.needsUpdate = true;
  }, [lamps, geometries]);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const { flameLevel, haloLevel, poolLevel } = geometries;
    flameMaterial.uniforms.uTime.value = t;
    flameMaterial.uniforms.uMotion.value = world.motion;
    flameMaterial.uniforms.uSway.value = pointer.sway * 0.4 * world.motion;
    flameMaterial.uniforms.uLevel.value = 0.82;

    for (let i = 0; i < count; i++) {
      const lamp = lamps[i];
      // A lamp brightens slightly when the pointer passes near it on the floor.
      const d = Math.hypot(pointer.floor.x - lamp.x, pointer.floor.z - lamp.z);
      const target = Math.max(0, 1 - d / PROXIMITY_RADIUS);
      proximity.current[i] += (target - proximity.current[i]) * Math.min(1, dt * 4);

      const lit = lampLevels[i].value;
      const f = flicker(t, i * 2.17 + 0.5, world.motion);
      const level = lit * f * (1 + proximity.current[i] * 0.25);
      flameLevel.setX(i, level);
      haloLevel.setX(i, level * world.glow * (0.9 + proximity.current[i] * 0.5));
      poolLevel.setX(i, level * world.glow);
    }
    flameLevel.needsUpdate = true;
    haloLevel.needsUpdate = true;
    poolLevel.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[geometries.body, materials.body, count]} />
      {/* At this distance the ghee and wick read as a dark smudge; skip them on weak devices. */}
      {quality !== 'low' && <instancedMesh ref={oilRef} args={[geometries.oil, materials.oil, count]} />}
      {quality !== 'low' && <instancedMesh ref={wickRef} args={[geometries.wick, materials.wick, count]} />}
      <instancedMesh ref={shadowRef} args={[geometries.shadow, shadowMaterial, count]} renderOrder={1} />
      <instancedMesh ref={poolRef} args={[geometries.pool, poolMaterial, count]} renderOrder={1} />
      <instancedMesh ref={haloRef} args={[geometries.halo, haloMaterial, count]} renderOrder={2} />
      <instancedMesh ref={flameRef} args={[geometries.flame, flameMaterial, count]} renderOrder={3} frustumCulled={false} />
    </group>
  );
}
