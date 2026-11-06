import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Vector3, type Group, type Mesh, type PointLight, type ShaderMaterial } from 'three';
import { world, pointer } from '../../animations/world';
import { FLAME_LOCAL, FLAME_WORLD, SPOUT_YAW } from '../../scene/layout';
import { createGlowMaterial, getGlowGeometry } from '../../scene/shaders/glowMaterial';
import { clamp01, damp, flicker } from '../../utils/flicker';
import { createDiyaBody, createOilSurface, createWick } from './diyaGeometry';
import { getDiyaMaterials } from './diyaMaterials';
import { createFlameMaterial, getFlameGeometry } from './flameMaterial';
import type { Quality } from '../../state/store';

interface HeroDiyaProps {
  quality: Quality;
}

/** Candela at full light. The pool on the floor should reach ~1m. */
const LIGHT_INTENSITY = 0.6;
// At the flame's visual centre, not the wick: keeps the inner wall from blowing out.
const LIGHT_OFFSET = new Vector3(0, 0.05, 0);

const SEGMENTS: Record<Quality, number> = { high: 128, medium: 96, low: 64 };

const screenScratch = new Vector3();

export function HeroDiya({ quality }: HeroDiyaProps) {
  const materials = getDiyaMaterials();
  const segments = SEGMENTS[quality];
  const body = useMemo(() => createDiyaBody(segments), [segments]);
  const oil = useMemo(() => createOilSurface(segments), [segments]);
  const wick = useMemo(() => createWick(), []);

  const flameMaterial = useMemo(createFlameMaterial, []);
  const halo = useMemo(() => createGlowMaterial('sphere', '#ff8a1f', 0.55, 18), []);
  const spark = useMemo(() => createGlowMaterial('sphere', '#fff4b0', 0, 60), []);
  const pool = useMemo(() => createGlowMaterial('floor', '#ff7a18', 0, 14), []);
  const contact = useMemo(() => createGlowMaterial('shadow', '#020001', 0.82, 3), []);

  const light = useRef<PointLight>(null);
  const flame = useRef<Mesh>(null);
  const haloMesh = useRef<Mesh>(null);
  const poolMesh = useRef<Mesh>(null);
  const group = useRef<Group>(null);

  useFrame(({ clock, camera, size }, dt) => {
    const t = clock.elapsedTime;
    const motion = world.motion;
    const f = flicker(t, 0, motion);
    const level = world.flame * (1 + world.boost * 0.18);
    const brightness = world.light * world.glow * (1 + world.boost * 0.6);

    // Pointer lean decays back to upright.
    pointer.sway *= 1 - damp(3, dt);

    const fm = flameMaterial as ShaderMaterial;
    fm.uniforms.uTime.value = t;
    fm.uniforms.uLevel.value = level * (0.94 + (f - 1) * 0.8);
    fm.uniforms.uSway.value = pointer.sway * motion;
    fm.uniforms.uMotion.value = motion;
    fm.uniforms.uLift.value = world.lift;

    if (light.current) {
      light.current.intensity = LIGHT_INTENSITY * brightness * f;
      // The light breathes with the flame by drifting a few millimetres.
      light.current.position.set(
        FLAME_WORLD.x + Math.sin(t * 3.1) * 0.002 * motion + pointer.sway * 0.004,
        FLAME_WORLD.y + LIGHT_OFFSET.y,
        FLAME_WORLD.z + Math.cos(t * 2.3) * 0.002 * motion,
      );
    }

    halo.uniforms.uIntensity.value = 0.5 * world.flame * world.glow * f;
    haloMesh.current?.scale.setScalar(0.16 + 0.05 * world.glow + world.boost * 0.06);
    spark.uniforms.uIntensity.value = world.spark * 2.2;
    pool.uniforms.uIntensity.value = 0.1 * world.floorGlow * world.light * world.glow * f;
    poolMesh.current?.scale.setScalar(0.4 + 2.6 * world.floorGlow);

    const { body: bodyMat, oil: oilMat, wick: wickMat } = materials;
    wickMat.emissiveIntensity = world.wick * 2.4 * (0.85 + 0.15 * f) + world.flame * 0.6;
    oilMat.emissiveIntensity = world.light * 0.035 * f;
    bodyMat.emissiveIntensity = 0;

    // Flame position on screen, for the cursor's warmth.
    screenScratch.copy(FLAME_WORLD).project(camera);
    pointer.flameScreen.set(
      (screenScratch.x * 0.5 + 0.5) * size.width,
      (-screenScratch.y * 0.5 + 0.5) * size.height,
    );

    if (group.current) {
      // The unlit diya rises out of darkness: a slight settle as it emerges.
      group.current.position.y = (1 - clamp01(world.intro)) * -0.004;
    }
  });

  return (
    <group>
      <group ref={group} rotation-y={SPOUT_YAW}>
        <mesh geometry={body} material={materials.body} />
        <mesh geometry={oil} material={materials.oil} />
        <mesh geometry={wick} material={materials.wick} />
        <mesh ref={flame} geometry={getFlameGeometry()} material={flameMaterial} position={FLAME_LOCAL} renderOrder={3} />
        <mesh
          geometry={getGlowGeometry('sphere')}
          material={spark}
          position={[FLAME_LOCAL.x, FLAME_LOCAL.y + 0.004, FLAME_LOCAL.z]}
          scale={0.05}
          renderOrder={4}
        />
      </group>
      <mesh
        ref={haloMesh}
        geometry={getGlowGeometry('sphere')}
        material={halo}
        position={[FLAME_WORLD.x, FLAME_WORLD.y + 0.022, FLAME_WORLD.z]}
        renderOrder={2}
      />
      <mesh geometry={getGlowGeometry('shadow')} material={contact} position-y={0.0008} scale={[0.2, 1, 0.2]} renderOrder={1} />
      <mesh
        ref={poolMesh}
        geometry={getGlowGeometry('floor')}
        material={pool}
        position={[FLAME_WORLD.x * 0.5, 0.001, FLAME_WORLD.z * 0.5]}
        renderOrder={1}
      />
      <pointLight ref={light} color="#ff9a3c" intensity={0} distance={0} decay={2} />
    </group>
  );
}
