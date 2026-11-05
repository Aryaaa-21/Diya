import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  SphereGeometry,
} from 'three';
import { world } from '../animations/world';
import type { Quality } from '../state/store';
import { mulberry32 } from '../utils/textures';
import { NOISE } from './shaders/common';

/** The night: sky dome, stars, floor, distant palace silhouettes, far lamps. */

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`;
const skyFragment = /* glsl */ `
  uniform float uReveal;
  uniform float uTime;
  varying vec3 vDir;
  ${NOISE}
  void main() {
    float h = vDir.y;
    // Near-black overhead, a deep maroon breath at the horizon where the city's light rises.
    vec3 top = vec3(0.012, 0.004, 0.008);
    vec3 horizon = vec3(0.09, 0.022, 0.03);
    vec3 col = mix(horizon, top, smoothstep(-0.02, 0.38, h));
    float haze = valueNoise(vec2(atan(vDir.z, vDir.x) * 3.0, h * 6.0) + uTime * 0.01);
    col += vec3(0.05, 0.018, 0.01) * haze * smoothstep(0.3, 0.0, h) * smoothstep(-0.1, 0.05, h);
    col = mix(vec3(0.02, 0.006, 0.01), col, 0.25 + 0.75 * uReveal);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const starVertex = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime;
  uniform float uReveal;
  uniform float uPixelRatio;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_Position.z = gl_Position.w * 0.9999;
    float tw = 0.65 + 0.35 * sin(uTime * (0.6 + aPhase) + aPhase * 40.0);
    vAlpha = tw * uReveal * smoothstep(0.02, 0.2, normalize(position).y);
    gl_PointSize = aSize * uPixelRatio;
  }
`;
const starFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.0, d);
    gl_FragColor = vec4(vec3(1.0, 0.9, 0.76) * a * a * vAlpha * 0.55, 1.0);
  }
`;

const floorFragmentPatch = /* glsl */ `
  #include <dithering_fragment>
  // Fade the floor's far edge into the night so there's no visible horizon line.
  float edge = smoothstep(14.0, 5.0, length(vFloorPos));
  gl_FragColor.rgb *= edge;
`;

function createFloorMaterial(): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ color: new Color('#1a0a0b'), roughness: 0.9, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vFloorPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFloorPos = (modelMatrix * vec4(position, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vFloorPos;')
      .replace('#include <dithering_fragment>', floorFragmentPatch);
  };
  return material;
}

/** Palace silhouettes: domes, chhatris and arches, drawn as flat shapes on a far arc. */
function createSkyline(random: () => number): BufferGeometry {
  const shape = new Shape();
  const width = 60;
  shape.moveTo(-width / 2, -1);
  let x = -width / 2;
  shape.lineTo(x, 1.2);
  while (x < width / 2) {
    const kind = random();
    const w = 1.2 + random() * 2.6;
    const h = 1 + random() * 2.2;
    if (kind < 0.35) {
      // Dome on a drum
      shape.lineTo(x, h);
      shape.lineTo(x + w * 0.12, h);
      shape.quadraticCurveTo(x + w * 0.12, h + w * 0.55, x + w * 0.5, h + w * 0.62);
      shape.lineTo(x + w * 0.5, h + w * 0.82);
      shape.lineTo(x + w * 0.52, h + w * 0.62);
      shape.quadraticCurveTo(x + w * 0.88, h + w * 0.55, x + w * 0.88, h);
      shape.lineTo(x + w, h);
    } else if (kind < 0.6) {
      // Chhatri: pillared pavilion with a small cupola
      shape.lineTo(x, h * 0.8);
      shape.lineTo(x + w * 0.2, h * 0.8);
      shape.quadraticCurveTo(x + w * 0.2, h * 0.8 + w * 0.4, x + w * 0.5, h * 0.8 + w * 0.45);
      shape.quadraticCurveTo(x + w * 0.8, h * 0.8 + w * 0.4, x + w * 0.8, h * 0.8);
      shape.lineTo(x + w, h * 0.8);
    } else if (kind < 0.75) {
      // Minaret
      const mw = 0.35;
      shape.lineTo(x, 0.9);
      shape.lineTo(x + w * 0.4, 0.9);
      shape.lineTo(x + w * 0.4, h * 1.9);
      shape.lineTo(x + w * 0.4 + mw / 2, h * 1.9 + 0.5);
      shape.lineTo(x + w * 0.4 + mw, h * 1.9);
      shape.lineTo(x + w * 0.4 + mw, 0.9);
      shape.lineTo(x + w, 0.9);
    } else {
      // Low wall with crenellation
      const steps = 3 + Math.floor(random() * 3);
      for (let i = 0; i < steps; i++) {
        const sx = x + (w / steps) * i;
        shape.lineTo(sx, 0.75);
        shape.lineTo(sx, 0.9);
        shape.lineTo(sx + w / steps / 2, 0.9);
        shape.lineTo(sx + w / steps / 2, 0.75);
      }
    }
    x += w;
  }
  shape.lineTo(width / 2, -1);
  shape.closePath();
  return new ShapeGeometry(shape, 6);
}

/** Tiny warm points along the skyline: other people's diyas, very far away. */
function createDistantLights(random: () => number, count: number): BufferGeometry {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const a = (random() - 0.5) * Math.PI * 0.95;
    const r = 15 + random() * 10;
    positions.set([Math.sin(a) * r, 0.15 + random() * random() * 2.2, -Math.cos(a) * r], i * 3);
    sizes[i] = 1.2 + random() * 2.4;
    phases[i] = random();
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(positions, 3));
  g.setAttribute('aSize', new BufferAttribute(sizes, 1));
  g.setAttribute('aPhase', new BufferAttribute(phases, 1));
  return g;
}

const distantVertex = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime;
  uniform float uReveal;
  uniform float uIntro;
  uniform float uPixelRatio;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float flick = 0.8 + 0.2 * sin(uTime * (2.0 + aPhase * 3.0) + aPhase * 30.0);
    // A few are visible from the start; the rest come up with the world.
    float on = mix(step(0.86, aPhase) * uIntro * 0.5, 1.0, smoothstep(aPhase * 0.7, aPhase * 0.7 + 0.3, uReveal));
    vAlpha = flick * on;
    gl_PointSize = aSize * uPixelRatio * (1.0 + 0.4 * on);
  }
`;
const distantFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = pow(max(0.0, 1.0 - d), 2.2);
    gl_FragColor = vec4(vec3(1.0, 0.6, 0.22) * a * vAlpha * 0.9, 1.0);
  }
`;

const STAR_COUNT: Record<Quality, number> = { high: 900, medium: 600, low: 350 };
const DISTANT_COUNT: Record<Quality, number> = { high: 160, medium: 110, low: 70 };

export function Environment({ quality }: { quality: Quality }) {
  const assets = useMemo(() => {
    const random = mulberry32(42);

    const stars = new BufferGeometry();
    const count = STAR_COUNT[quality];
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const u = random() * Math.PI * 2;
      const v = Math.acos(1 - random() * 0.95);
      const r = 60;
      positions.set([Math.sin(v) * Math.cos(u) * r, Math.cos(v) * r, Math.sin(v) * Math.sin(u) * r], i * 3);
      sizes[i] = 0.6 + Math.pow(random(), 6) * 2.4;
      phases[i] = random();
    }
    stars.setAttribute('position', new BufferAttribute(positions, 3));
    stars.setAttribute('aSize', new BufferAttribute(sizes, 1));
    stars.setAttribute('aPhase', new BufferAttribute(phases, 1));

    const floor = new PlaneGeometry(40, 40);
    floor.rotateX(-Math.PI / 2);

    return {
      sky: new SphereGeometry(80, 32, 16),
      skyMaterial: new ShaderMaterial({
        uniforms: { uReveal: { value: 0 }, uTime: { value: 0 } },
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        side: BackSide,
        depthWrite: false,
        fog: false,
      }),
      stars,
      starMaterial: new ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uReveal: { value: 0 }, uPixelRatio: { value: 1 } },
        vertexShader: starVertex,
        fragmentShader: starFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        fog: false,
      }),
      floor,
      floorMaterial: createFloorMaterial(),
      skylineNear: createSkyline(random),
      skylineFar: createSkyline(random),
      skylineNearMaterial: new MeshStandardMaterial({ color: '#0c0306', roughness: 1, fog: true }),
      skylineFarMaterial: new MeshStandardMaterial({ color: '#130509', roughness: 1, fog: true }),
      distant: createDistantLights(random, DISTANT_COUNT[quality]),
      distantMaterial: new ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uReveal: { value: 0 }, uIntro: { value: 0 }, uPixelRatio: { value: 1 } },
        vertexShader: distantVertex,
        fragmentShader: distantFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        fog: false,
      }),
    };
  }, [quality]);

  // Quality changes rebuild these; release the old GPU memory rather than leaking it.
  useEffect(
    () => () => {
      for (const value of Object.values(assets)) {
        if (value && typeof (value as { dispose?: () => void }).dispose === 'function') {
          (value as { dispose: () => void }).dispose();
        }
      }
    },
    [assets],
  );

  useFrame(({ clock, viewport }) => {
    const t = clock.elapsedTime;
    assets.skyMaterial.uniforms.uReveal.value = world.environment;
    assets.skyMaterial.uniforms.uTime.value = t;
    assets.starMaterial.uniforms.uTime.value = t;
    assets.starMaterial.uniforms.uReveal.value = world.environment;
    assets.starMaterial.uniforms.uPixelRatio.value = viewport.dpr;
    assets.distantMaterial.uniforms.uTime.value = t;
    assets.distantMaterial.uniforms.uReveal.value = world.environment;
    assets.distantMaterial.uniforms.uIntro.value = world.intro;
    assets.distantMaterial.uniforms.uPixelRatio.value = viewport.dpr;
  });

  return (
    <group>
      <mesh geometry={assets.sky} material={assets.skyMaterial} renderOrder={-10} frustumCulled={false} />
      <points geometry={assets.stars} material={assets.starMaterial} renderOrder={-9} frustumCulled={false} />
      <mesh geometry={assets.floor} material={assets.floorMaterial} />
      <mesh geometry={assets.skylineFar} material={assets.skylineFarMaterial} position={[4, -0.4, -26]} scale={[1.2, 0.85, 1]} />
      <mesh geometry={assets.skylineNear} material={assets.skylineNearMaterial} position={[-3, -0.6, -17]} scale={[0.8, 0.6, 1]} />
      <points geometry={assets.distant} material={assets.distantMaterial} frustumCulled={false} />
    </group>
  );
}
