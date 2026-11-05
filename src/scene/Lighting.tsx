import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { AmbientLight, DirectionalLight, HemisphereLight } from 'three';
import { world } from '../animations/world';

/**
 * Fill light only. The diya's point light (in HeroDiya) is the one real source;
 * these just keep the darkness from crushing to pure black once the world opens.
 */
export function Lighting() {
  const ambient = useRef<AmbientLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const rim = useRef<DirectionalLight>(null);

  useFrame(() => {
    if (ambient.current) ambient.current.intensity = 0.05 + 0.06 * world.intro;
    if (hemi.current) hemi.current.intensity = 0.12 * world.environment;
    // A faint back light so the unlit diya's rim emerges from the dark; it recedes once the flame takes over.
    if (rim.current) rim.current.intensity = world.intro * (0.9 - 0.55 * world.light);
  });

  return (
    <>
      <ambientLight ref={ambient} color="#3a1410" intensity={0} />
      {/* Maroon night sky above, faint warm bounce from below. */}
      <hemisphereLight ref={hemi} args={['#4a0d18', '#2a1206', 0]} />
      <directionalLight ref={rim} color="#b0623a" intensity={0} position={[-0.6, 0.9, -1.2]} />
    </>
  );
}
