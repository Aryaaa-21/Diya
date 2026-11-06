import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  PlaneGeometry,
  ShaderMaterial,
  type Mesh,
  type Points,
} from 'three';
import { world } from '../../animations/world';
import { FLAME_WORLD } from '../../scene/layout';
import { NOISE } from '../../scene/shaders/common';
import type { Quality } from '../../state/store';
import { mulberry32 } from '../../utils/textures';

/**
 * When the diya catches, its light lifts off the wick and climbs into the night:
 * a tapering plume with a bright head, trailing embers behind it. Everything is
 * driven by `world.ascend` (0..1) in the vertex/fragment shaders, so the whole
 * thing is two draw calls and no per-frame buffer uploads. Both objects are
 * hidden outside the ascent, so they cost nothing before or after.
 */

/** How far the light travels, in metres. Well past the top of frame. */
const HEIGHT = 2.4;
/** Narrow: a streak of fire leaving the wick, not a column of haze. */
const WIDTH = 0.13;
const EMBERS: Record<Quality, number> = { high: 56, medium: 40, low: 24 };

/** Fades in at lift-off and out as the head leaves the frame. */
function intensityFor(p: number): number {
  if (p <= 0 || p >= 1) return 0;
  const inn = Math.min(1, p / 0.07);
  const out = 1 - Math.max(0, (p - 0.74) / 0.26);
  return inn * out * out;
}

const plumeVertex = /* glsl */ `
  uniform float uWidth;
  uniform float uHeight;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // Cylindrical billboard: the plume always faces the camera and stays upright.
    vec3 center = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec3 toCam = cameraPosition - center;
    toCam.y = 0.0;
    vec3 right = length(toCam) < 1e-4
      ? vec3(1.0, 0.0, 0.0)
      : normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
    vec3 local = right * (position.x * uWidth) + vec3(0.0, position.y * uHeight, 0.0);
    gl_Position = projectionMatrix * viewMatrix * vec4(center + local, 1.0);
  }
`;

const plumeFragment = /* glsl */ `
  uniform float uProgress;
  uniform float uIntensity;
  uniform float uTime;
  uniform float uMotion;
  uniform vec3 uHead;
  uniform vec3 uTail;
  varying vec2 vUv;
  ${NOISE}
  void main() {
    float head = uProgress;
    float y = vUv.y;
    // Nothing much above the head: most of the quad leaves early.
    if (y > head + 0.07 || uIntensity < 0.002) discard;

    float d = head - y;
    float t = uTime * uMotion;
    // The column wanders as it climbs, more freely the higher it gets.
    float wander = (valueNoise(vec2(y * 3.4, t * 0.6)) - 0.5) * 0.7 * smoothstep(0.0, 0.45, y);
    float x = (vUv.x - 0.5) * 2.0 - wander;

    // Tight at the head, opening out only just behind it.
    float behind = max(d, 0.0);
    float w = 0.06 + 0.34 * clamp(behind * 5.0, 0.0, 1.0);
    float across = exp(-(x * x) / (w * w));
    // A bright comet head with a soft leading edge, a short glowing tail, and a
    // faint thread still running back to the wick.
    float lead = exp(min(d, 0.0) * 48.0);
    float along = (exp(-behind * 16.0) + 0.12 * exp(-behind * 3.5)) * lead;
    float thread = 0.07 * exp(-(x * x) / 0.0016) * smoothstep(0.0, 0.06, y) * step(0.0, d);
    float shimmer = 0.82 + 0.34 * valueNoise(vec2(t * 2.6, y * 9.0));

    float a = (across * along + thread) * shimmer * uIntensity;
    vec3 color = mix(uTail, uHead, exp(-behind * 26.0) * lead);
    gl_FragColor = vec4(color * a, 1.0);
  }
`;

const emberVertex = /* glsl */ `
  attribute vec3 aSeed;
  uniform float uProgress;
  uniform float uTime;
  uniform float uMotion;
  uniform float uHeight;
  uniform float uPixelRatio;
  uniform vec3 uOrigin;
  varying float vAlpha;
  void main() {
    // Each ember lags a little, so they string out behind the head.
    float lag = aSeed.y * 0.42;
    float p = clamp((uProgress - lag) / max(1e-3, 1.0 - lag), 0.0, 1.0);
    float t = uTime * uMotion;
    float spread = 0.012 + 0.26 * p * (0.4 + aSeed.z);
    vec3 pos = uOrigin + vec3(
      sin(aSeed.x * 37.0 + t * 1.1) * spread,
      p * uHeight * (0.86 + aSeed.z * 0.3),
      cos(aSeed.x * 23.0 + t * 0.8) * spread * 0.7
    );
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    float life = smoothstep(0.0, 0.06, p) * (1.0 - smoothstep(0.66, 1.0, p));
    float flick = 0.6 + 0.4 * sin(t * (5.0 + aSeed.z * 9.0) + aSeed.x * 40.0);
    vAlpha = life * flick * step(0.001, uProgress) * (1.0 - step(1.0, uProgress));
    gl_PointSize = (1.3 + aSeed.z * 2.4) * uPixelRatio * clamp(3.2 / -mv.z, 0.5, 3.0);
  }
`;

const emberFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    if (vAlpha < 0.004) discard;
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = pow(max(0.0, 1.0 - d), 2.0);
    gl_FragColor = vec4(vec3(1.0, 0.68, 0.26) * a * vAlpha, 1.0);
  }
`;

export function RisingLight({ quality }: { quality: Quality }) {
  const plume = useRef<Mesh>(null);
  const embers = useRef<Points>(null);

  const assets = useMemo(() => {
    const plumeGeometry = new PlaneGeometry(1, 1);
    // Anchor the quad's base at the flame.
    plumeGeometry.translate(0, 0.5, 0);

    const count = EMBERS[quality];
    const random = mulberry32(31);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      seeds.set([random(), Math.pow(random(), 0.8), random()], i * 3);
    }
    const emberGeometry = new BufferGeometry();
    emberGeometry.setAttribute('position', new BufferAttribute(positions, 3));
    emberGeometry.setAttribute('aSeed', new BufferAttribute(seeds, 3));

    return {
      plumeGeometry,
      plumeMaterial: new ShaderMaterial({
        uniforms: {
          uProgress: { value: 0 },
          uIntensity: { value: 0 },
          uTime: { value: 0 },
          uMotion: { value: 1 },
          uWidth: { value: WIDTH },
          uHeight: { value: HEIGHT },
          uHead: { value: new Color('#ffeeb4') },
          uTail: { value: new Color('#ff8a1f') },
        },
        vertexShader: plumeVertex,
        fragmentShader: plumeFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
        fog: false,
      }),
      emberGeometry,
      emberMaterial: new ShaderMaterial({
        uniforms: {
          uProgress: { value: 0 },
          uTime: { value: 0 },
          uMotion: { value: 1 },
          uHeight: { value: HEIGHT },
          uPixelRatio: { value: 1 },
          uOrigin: { value: FLAME_WORLD.clone().setY(FLAME_WORLD.y + 0.03) },
        },
        vertexShader: emberVertex,
        fragmentShader: emberFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
        fog: false,
      }),
    };
  }, [quality]);

  useEffect(
    () => () => {
      assets.plumeGeometry.dispose();
      assets.plumeMaterial.dispose();
      assets.emberGeometry.dispose();
      assets.emberMaterial.dispose();
    },
    [assets],
  );

  useFrame(({ clock, viewport }) => {
    const p = world.ascend;
    const intensity = intensityFor(p);
    const active = intensity > 0.002;
    if (plume.current) plume.current.visible = active;
    if (embers.current) embers.current.visible = active;
    if (!active) return;

    const t = clock.elapsedTime;
    const pu = assets.plumeMaterial.uniforms;
    pu.uProgress.value = p;
    pu.uIntensity.value = intensity;
    pu.uTime.value = t;
    pu.uMotion.value = world.motion;

    const eu = assets.emberMaterial.uniforms;
    eu.uProgress.value = p;
    eu.uTime.value = t;
    eu.uMotion.value = world.motion;
    eu.uPixelRatio.value = viewport.dpr;
  });

  return (
    <>
      {/* The plume's own origin is the flame; the embers read theirs from a uniform. */}
      <mesh
        ref={plume}
        geometry={assets.plumeGeometry}
        material={assets.plumeMaterial}
        position={[FLAME_WORLD.x, FLAME_WORLD.y + 0.02, FLAME_WORLD.z]}
        visible={false}
        frustumCulled={false}
        renderOrder={4}
      />
      <points
        ref={embers}
        geometry={assets.emberGeometry}
        material={assets.emberMaterial}
        visible={false}
        frustumCulled={false}
        renderOrder={5}
      />
    </>
  );
}
