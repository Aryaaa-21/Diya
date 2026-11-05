import { AdditiveBlending, Color, NormalBlending, PlaneGeometry, ShaderMaterial, type ColorRepresentation } from 'three';
import { BILLBOARD_SPHERE, INSTANCE_MATRIX } from './common';

/**
 * Soft additive light, used three ways:
 *  - 'sphere': a halo around a flame, always facing the camera
 *  - 'floor':  a warm pool lying on the ground
 *  - 'shadow': the same falloff, but darkening (contact shadow under a lamp)
 * Instanced variants read a per-instance aLevel.
 */
export type GlowKind = 'sphere' | 'floor' | 'shadow';

let quad: PlaneGeometry | null = null;
let floorQuad: PlaneGeometry | null = null;

export function getGlowGeometry(kind: GlowKind): PlaneGeometry {
  if (kind === 'sphere') {
    quad ??= new PlaneGeometry(1, 1);
    return quad;
  }
  if (!floorQuad) {
    floorQuad = new PlaneGeometry(1, 1);
    floorQuad.rotateX(-Math.PI / 2);
  }
  return floorQuad;
}

const vertexShader = /* glsl */ `
  #ifdef USE_INSTANCING
    attribute float aLevel;
  #endif
  varying vec2 vUv;
  varying float vLevel;
  ${INSTANCE_MATRIX}
  ${BILLBOARD_SPHERE}
  void main() {
    vUv = uv;
    #ifdef USE_INSTANCING
      vLevel = aLevel;
    #else
      vLevel = 1.0;
    #endif
    #ifdef SPHERE
      vec3 world = billboardSphere(objectMatrix(), position);
    #else
      vec3 world = (objectMatrix() * vec4(position, 1.0)).xyz;
    #endif
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uFalloff;
  varying vec2 vUv;
  varying float vLevel;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    if (d > 1.0) discard;
    // Inverse-square-ish core with a soft edge that reaches zero at the quad border.
    float g = (1.0 / (1.0 + d * d * uFalloff) - 1.0 / (1.0 + uFalloff)) / (1.0 - 1.0 / (1.0 + uFalloff));
    g *= uIntensity * vLevel;
    #ifdef SHADOW
      gl_FragColor = vec4(uColor, clamp(g, 0.0, 1.0));
    #else
      gl_FragColor = vec4(uColor * g, 1.0);
    #endif
  }
`;

export function createGlowMaterial(
  kind: GlowKind,
  color: ColorRepresentation,
  intensity = 1,
  falloff = 12,
): ShaderMaterial {
  const shadow = kind === 'shadow';
  return new ShaderMaterial({
    defines: kind === 'sphere' ? { SPHERE: '' } : shadow ? { SHADOW: '' } : {},
    uniforms: {
      uColor: { value: new Color(color) },
      uIntensity: { value: intensity },
      uFalloff: { value: falloff },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: shadow ? NormalBlending : AdditiveBlending,
    toneMapped: false,
    // Floor pools sit a hair above the ground; polygon offset avoids z-fighting.
    polygonOffset: kind !== 'sphere',
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
}
