import { useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useMemo } from 'react';
import { Color, PlaneGeometry } from 'three';
import { pointer, world } from '../../animations/world';
import { FLAME_WORLD, RANGOLI_RADIUS } from '../../scene/layout';
import { getState, subscribe } from '../../state/store';
import { ACCENTS, createRangoliMaterial } from './rangoliMaterial';

/**
 * Floor rangoli. Pattern/symmetry/accent changes animate by moving the current
 * state into slot A and the new one into slot B, then sweeping uMix 0 -> 1.
 */
export function Rangoli() {
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(RANGOLI_RADIUS * 2.05, RANGOLI_RADIUS * 2.05);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const material = useMemo(() => createRangoliMaterial(FLAME_WORLD, RANGOLI_RADIUS), []);

  useEffect(() => {
    const u = material.uniforms;
    let last = getState();
    const apply = (initial: boolean) => {
      const s = getState();
      u.uPatternB.value = s.rangoliPattern;
      u.uSymB.value = s.rangoliSymmetry;
      (u.uAccentB.value as Color).set(ACCENTS[s.rangoliAccent].color);
      if (initial) {
        u.uPatternA.value = s.rangoliPattern;
        u.uSymA.value = s.rangoliSymmetry;
        (u.uAccentA.value as Color).set(ACCENTS[s.rangoliAccent].color);
        u.uMix.value = 1;
      }
    };
    apply(true);
    return subscribe(() => {
      const s = getState();
      if (
        s.rangoliPattern === last.rangoliPattern &&
        s.rangoliSymmetry === last.rangoliSymmetry &&
        s.rangoliAccent === last.rangoliAccent
      ) {
        last = s;
        return;
      }
      last = s;
      // Freeze what's on screen into A (B was fully shown), then draw the new state as B.
      u.uPatternA.value = u.uPatternB.value;
      u.uSymA.value = u.uSymB.value;
      (u.uAccentA.value as Color).copy(u.uAccentB.value as Color);
      apply(false);
      gsap.killTweensOf(u.uMix);
      u.uMix.value = 0;
      gsap.to(u.uMix, { value: 1, duration: world.motion < 1 ? 0.4 : 1.6, ease: 'power2.inOut' });
    });
  }, [material]);

  useFrame(({ clock }) => {
    const u = material.uniforms;
    u.uTime.value = clock.elapsedTime;
    u.uReveal.value = world.rangoli;
    u.uLight.value = world.light * world.glow * (1 + world.boost * 0.5);
    u.uPointer.value.copy(pointer.floor);
  });

  return <mesh geometry={geometry} material={material} position-y={0.0005} renderOrder={0} />;
}
