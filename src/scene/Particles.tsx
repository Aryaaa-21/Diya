import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial } from 'three';
import { pointer, world } from '../animations/world';
import type { Quality } from '../state/store';
import { mulberry32 } from '../utils/textures';
import { FLAME_WORLD } from './layout';

const COUNT: Record<Quality, number> = { high: 420, medium: 260, low: 120 };

/**
 * Dust and embers. Motion is computed entirely on the GPU from a seed per
 * particle: slow upward drift that wraps, a lazy horizontal wander, and a
 * gentle push away from the pointer. No per-frame buffer uploads.
 */
const vertexShader = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uTime;
  uniform float uMotion;
  uniform float uPixelRatio;
  uniform float uReveal;
  uniform vec3 uPointer;
  uniform vec3 uFlame;
  varying float vAlpha;
  varying float vEmber;
  void main() {
    float t = uTime * uMotion;
    vec3 p = position;
    float ember = step(0.84, aSeed.w);
    // Embers rise faster and from near the lamps; dust barely moves.
    float speed = mix(0.012, 0.07, ember) * (0.6 + aSeed.x);
    float height = 3.2;
    p.y = mod(p.y + t * speed, height);
    p.x += sin(t * 0.21 + aSeed.y * 40.0) * 0.14 + sin(t * 0.47 + aSeed.z * 20.0) * 0.05;
    p.z += cos(t * 0.17 + aSeed.z * 31.0) * 0.12;

    vec2 away = p.xz - uPointer.xz;
    float d = length(away);
    p.xz += normalize(away + 1e-4) * 0.12 * exp(-d * d * 18.0) * smoothstep(0.6, 0.0, p.y);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = mix(1.4, 2.6, aSeed.x) + ember * 1.4;
    gl_PointSize = size * uPixelRatio * clamp(3.0 / -mv.z, 0.6, 3.0);

    // Fade in at the floor and out near the top so wrapping is invisible.
    float edge = smoothstep(0.0, 0.25, p.y) * smoothstep(height, height - 0.8, p.y);
    float flicker = 0.6 + 0.4 * sin(uTime * (1.0 + aSeed.y * 3.0) + aSeed.z * 50.0);
    // Close to the flame, motes catch more light.
    float lit = 0.4 + 0.9 * exp(-distance(p, uFlame) * 1.6);
    vAlpha = edge * flicker * lit * uReveal * mix(0.35, 0.8, ember);
    vEmber = ember;
  }
`;

const fragmentShader = /* glsl */ `
  varying float vAlpha;
  varying float vEmber;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = pow(max(0.0, 1.0 - d), 2.0);
    vec3 dust = vec3(0.95, 0.72, 0.42);
    vec3 ember = vec3(1.0, 0.55, 0.16);
    gl_FragColor = vec4(mix(dust, ember, vEmber) * a * vAlpha, 1.0);
  }
`;

export function Particles({ quality }: { quality: Quality }) {
  const { geometry, material } = useMemo(() => {
    const random = mulberry32(7);
    const count = COUNT[quality];
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      // Denser near the diya, thinning out with distance.
      const r = 0.15 + Math.pow(random(), 1.6) * 3.4;
      const a = random() * Math.PI * 2;
      positions.set([Math.cos(a) * r, random() * 3.2, Math.sin(a) * r - 0.4], i * 3);
      seeds.set([random(), random(), random(), random()], i * 4);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(positions, 3));
    g.setAttribute('aSeed', new BufferAttribute(seeds, 4));
    const m = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMotion: { value: 1 },
        uPixelRatio: { value: 1 },
        uReveal: { value: 0 },
        uPointer: { value: pointer.floor.clone() },
        uFlame: { value: FLAME_WORLD.clone() },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    return { geometry: g, material: m };
  }, [quality]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ clock, viewport }) => {
    const u = material.uniforms;
    u.uTime.value = clock.elapsedTime;
    u.uMotion.value = world.motion;
    u.uReveal.value = 0.15 * world.intro + 0.85 * world.particles;
    u.uPixelRatio.value = viewport.dpr;
    u.uPointer.value.copy(pointer.floor);
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={5} />;
}
