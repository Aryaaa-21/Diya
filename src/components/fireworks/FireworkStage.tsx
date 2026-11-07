import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, MathUtils, MeshBasicMaterial, RingGeometry, type Mesh, type PerspectiveCamera, type PointLight } from 'three';
import { pointer } from '../../animations/world';
import { FireworkManager } from '../../fireworks/FireworkManager';
import { queue } from '../../fireworks/queue';
import { KINDS } from '../../fireworks/types';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { clampToCourtyard } from '../../scene/layout';
import { useExperience, type Quality } from '../../state/store';
import { isCoarsePointer } from '../../utils/device';
import { damp } from '../../utils/flicker';

/**
 * The fireworks in the scene: one pooled particle object, one shared light, and
 * — while a courtyard piece is armed — a ring on the floor showing where it
 * would be set down.
 *
 * The light is mounted from the first frame and merely held at zero intensity
 * when nothing is burning. Mounting it later would change the lighting shader
 * permutation and cost a recompile mid-experience; this way it is compiled with
 * everything else during the loader's warm-up.
 */
export function FireworkStage({ quality }: { quality: Quality }) {
  const mode = useExperience((s) => s.mode);
  const kind = useExperience((s) => s.firework);
  const reducedMotion = useReducedMotion();
  const light = useRef<PointLight>(null);
  const reticle = useRef<Mesh>(null);
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);

  // The pool is sized for the tier, so a downgrade rebuilds it. Rare, and the
  // old one is disposed on the way out.
  const manager = useMemo(() => new FireworkManager(quality), [quality]);
  useEffect(() => () => manager.dispose(), [manager]);

  const { ringGeometry, ringMaterial } = useMemo(
    () => ({
      ringGeometry: new RingGeometry(0.1, 0.125, 40),
      ringMaterial: new MeshBasicMaterial({
        color: '#f5b942',
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    }),
    [],
  );
  useEffect(
    () => () => {
      ringGeometry.dispose();
      ringMaterial.dispose();
    },
    [ringGeometry, ringMaterial],
  );

  /**
   * Fireworks belong to the open sky: the world shot, Sky, Celebrate and
   * ambient mode. Walking away from those doesn't cut what is in the air — it
   * fades over about a second and is then cleared, which is the brief's
   * "particles fade, ambient night returns" rather than a hard stop.
   */
  const lit = mode === 'celebrate' || mode === 'sky' || mode === 'ambient' || mode === 'world';
  const fade = useRef(1);
  const cleared = useRef(false);

  const showReticle = mode === 'celebrate' && KINDS[kind].ground && !isCoarsePointer();

  useFrame((state, dt) => {
    const camera = state.camera as PerspectiveCamera;
    // Pixels per metre at one metre: lets the shader size a spark from its true
    // radius, so a 1 cm courtyard spark and a 10 cm shell star both read right.
    const proj = (size.height * gl.getPixelRatio()) / (2 * Math.tan((camera.fov * MathUtils.DEG2RAD) / 2));

    manager.now = state.clock.elapsedTime;
    // Drain this frame's taps. Requests that arrive too close together are
    // dropped by the manager, not queued up to fire later.
    while (queue.length) {
      const request = queue.shift();
      if (request) manager.ignite(request);
    }

    // Reduced motion also means a quieter sky, per the accessibility brief.
    const target = lit ? (reducedMotion ? 0.72 : 1) : 0;
    fade.current += (target - fade.current) * damp(3.5, dt);
    if (!lit && fade.current < 0.01) {
      if (!cleared.current) {
        manager.clear();
        cleared.current = true;
      }
    } else if (lit) {
      cleared.current = false;
    }

    manager.frame(state.clock.elapsedTime, dt, proj, fade.current);

    if (light.current) {
      const { intensity, x, y, z } = manager.lightState;
      // Fades with the particles, so leaving the mode doesn't leave the
      // courtyard flashing from a burst that is no longer drawn.
      light.current.intensity = intensity * fade.current;
      if (intensity > 0) light.current.position.set(x, y, z);
    }

    const ring = reticle.current;
    if (ring) {
      if (showReticle) {
        const [x, z] = clampToCourtyard(pointer.floor.x, pointer.floor.z);
        const k = damp(9, dt);
        ring.position.x += (x - ring.position.x) * k;
        ring.position.z += (z - ring.position.z) * k;
        ring.position.y = 0.004;
        const pulse = 0.5 + 0.22 * Math.sin(state.clock.elapsedTime * 2.6);
        ringMaterial.opacity += (pulse - ringMaterial.opacity) * damp(6, dt);
      } else if (ringMaterial.opacity > 0.001) {
        ringMaterial.opacity += (0 - ringMaterial.opacity) * damp(6, dt);
      }
      ring.visible = ringMaterial.opacity > 0.002;
    }
  });

  return (
    <>
      <primitive object={manager.sys.points} />
      {/* One light for every firework in the scene; see FireworkManager. */}
      <pointLight ref={light} color="#ffb46a" intensity={0} distance={0} decay={2} />
      <mesh ref={reticle} geometry={ringGeometry} material={ringMaterial} rotation={[-Math.PI / 2, 0, 0]} visible={false} renderOrder={4} />
    </>
  );
}
