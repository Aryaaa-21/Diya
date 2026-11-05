import { AdditiveBlending, Color, PlaneGeometry, ShaderMaterial } from 'three';
import { BILLBOARD_UPRIGHT, INSTANCE_MATRIX, NOISE } from '../../scene/shaders/common';

/** Flame quad in metres. Origin sits on the wick tip, inside the flame's dark base. */
export const FLAME_WIDTH = 0.026;
export const FLAME_HEIGHT = 0.062;
const BASE_UV = 0.13;

let geometry: PlaneGeometry | null = null;
export function getFlameGeometry(): PlaneGeometry {
  if (!geometry) {
    geometry = new PlaneGeometry(FLAME_WIDTH, FLAME_HEIGHT);
    geometry.translate(0, FLAME_HEIGHT * (0.5 - BASE_UV), 0);
  }
  return geometry;
}

const vertexShader = /* glsl */ `
  uniform float uLevel;
  uniform float uTime;
  uniform float uMotion;
  uniform float uLift;
  #ifdef USE_INSTANCING
    attribute float aLevel;
    attribute float aPhase;
  #endif
  varying vec2 vUv;
  varying float vLevel;
  varying float vPhase;
  ${INSTANCE_MATRIX}
  ${BILLBOARD_UPRIGHT}
  void main() {
    vUv = uv;
    #ifdef USE_INSTANCING
      vLevel = aLevel * uLevel;
      vPhase = aPhase;
    #else
      vLevel = uLevel;
      vPhase = 0.0;
    #endif
    // Flames grow taller than they grow wide; a breath stretches the height a little.
    float t = uTime * uMotion + vPhase * 17.0;
    float breathe = 1.0 + (sin(t * 5.1) * 0.04 + sin(t * 11.3) * 0.025) * uMotion;
    float lvl = clamp(vLevel, 0.0, 1.6);
    // uLift draws the flame up into a taller tongue as its light departs.
    vec3 local = vec3(position.x * mix(0.35, 1.0, min(lvl, 1.0)) * (0.9 + 0.1 * lvl) * (1.0 - 0.14 * uLift),
                      position.y * lvl * breathe * (1.0 + 0.5 * uLift), 0.0);
    gl_Position = projectionMatrix * viewMatrix * vec4(billboardUpright(objectMatrix(), local), 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uSway;
  uniform float uMotion;
  uniform vec3 uOuter;
  uniform vec3 uInner;
  uniform vec3 uCore;
  varying vec2 vUv;
  varying float vLevel;
  varying float vPhase;
  ${NOISE}

  // Teardrop field: < 1 inside. Below the base the shape is short and round,
  // above it is stretched and pinched toward the tip.
  float tear(vec2 p, float width, float above, float below) {
    float sy = p.y > 0.0 ? p.y / above : p.y / below;
    float up = clamp(sy, 0.0, 1.0);
    return length(vec2(p.x * (1.0 + up * up * 2.6) / width, sy));
  }

  void main() {
    if (vLevel < 0.003) discard;
    float t = uTime * uMotion + vPhase * 17.0;
    float y = vUv.y;

    // Rising turbulence, stronger toward the tip, plus pointer-driven lean.
    float n1 = valueNoise(vec2(vUv.x * 3.0 + vPhase * 9.0, y * 4.0 - t * 3.2)) - 0.5;
    float n2 = valueNoise(vec2(vUv.x * 8.0 + 3.0, y * 10.0 - t * 6.0)) - 0.5;
    float bend = (uSway * 0.6 + (n1 * 0.28 + n2 * 0.08) * max(uMotion, 0.25)) * y * y;
    vec2 p = vec2((vUv.x - 0.5) * 2.0 - bend, y - 0.24);

    float outer = 1.0 - smoothstep(0.55, 1.0, tear(p, 0.6, 0.74, 0.17));
    float inner = 1.0 - smoothstep(0.3, 1.0, tear(p + vec2(0.0, 0.01), 0.42, 0.5, 0.13));
    float core  = 1.0 - smoothstep(0.15, 1.0, tear(p + vec2(0.0, 0.025), 0.24, 0.27, 0.09));

    // A real flame is transparent where it meets the wick.
    float base = smoothstep(0.03, 0.2, y);
    outer *= base;
    inner *= smoothstep(0.06, 0.24, y);

    float shimmer = 0.92 + 0.16 * valueNoise(vec2(t * 2.0, vPhase * 5.0));
    vec3 color = uOuter * outer * 0.75 + uInner * inner * 0.9 + uCore * core * 0.95;
    float lvl = min(vLevel, 1.4);
    gl_FragColor = vec4(color * shimmer * smoothstep(0.0, 0.35, lvl) * (0.85 + 0.15 * lvl), 1.0);
  }
`;

export function createFlameMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uLevel: { value: 0 },
      uTime: { value: 0 },
      uSway: { value: 0 },
      uMotion: { value: 1 },
      uLift: { value: 0 },
      uOuter: { value: new Color('#ff8a1f') },
      uInner: { value: new Color('#ffd45a') },
      uCore: { value: new Color('#fff4b0') },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    fog: false,
  });
}
