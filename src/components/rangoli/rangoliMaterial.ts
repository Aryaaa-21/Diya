import { Color, ShaderMaterial, Vector3 } from 'three';
import { NOISE } from '../../scene/shaders/common';
import type { RangoliAccent } from '../../state/store';

/** Rangoli powders: all warm, all earthy. Values are linear-ish display colours. */
export const ACCENTS: Record<RangoliAccent, { label: string; color: string }> = {
  sindoor: { label: 'Sindoor', color: '#a3241f' },
  marigold: { label: 'Marigold', color: '#e0761c' },
  gold: { label: 'Haldi', color: '#d99a2b' },
  ivory: { label: 'Chalk', color: '#e8d6b2' },
};

const vertexShader = /* glsl */ `
  varying vec2 vPos;
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vPos = position.xz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

/**
 * The rangoli is drawn entirely in the fragment shader: polar coordinates are
 * folded by the symmetry count, then each pattern is a few distance fields.
 * Two pattern states (A and B) are blended with uMix so every change animates.
 */
const fragmentShader = /* glsl */ `
  #include <fog_pars_fragment>
  uniform float uRadius;
  uniform float uReveal;
  uniform float uLight;
  uniform float uTime;
  uniform vec3 uFlame;
  uniform vec3 uPointer;
  uniform float uPatternA;
  uniform float uPatternB;
  uniform float uSymA;
  uniform float uSymB;
  uniform float uMix;
  uniform vec3 uAccentA;
  uniform vec3 uAccentB;
  varying vec2 vPos;
  varying vec3 vWorld;
  ${NOISE}

  const float PI = 3.14159265;

  float stroke(float d, float w) {
    float aa = fwidth(d) * 1.2;
    return 1.0 - smoothstep(w - aa, w + aa, abs(d));
  }
  float fill(float d) {
    float aa = fwidth(d) * 1.2;
    return 1.0 - smoothstep(-aa, aa, d);
  }
  // Fold an angle into one mirrored sector of the symmetry.
  float fold(float a, float sym, float offset) {
    float sector = 2.0 * PI / sym;
    return abs(mod(a + offset * sector, sector) - sector * 0.5);
  }
  // Petal: lens shape pointing outward between radii r0 and r1, angular half-width w (radians at mid radius).
  float petal(float r, float a, float r0, float r1, float w) {
    float mid = (r0 + r1) * 0.5;
    float half_ = (r1 - r0) * 0.5;
    float t = (r - mid) / half_;
    float width = w * mid * sqrt(max(0.0, 1.0 - t * t)) * (1.0 - 0.35 * t);
    return max(abs(t) - 1.0, (a * r - width) / max(width, 1e-3) * 0.5) * half_;
  }
  float dotRing(float r, float a, float R, float sym, float size) {
    float sector = 2.0 * PI / sym;
    float aa = mod(a, sector) - sector * 0.5;
    return length(vec2(r - R, aa * R)) - size;
  }

  // Each pattern writes: x = chalk outline, y = accent powder, z = gold powder.
  vec3 lotus(float r, float theta, float sym) {
    float a = fold(theta, sym, 0.0);
    float b = fold(theta, sym, 0.5);
    float s = 2.0 * PI / sym;
    vec3 o = vec3(0.0);
    float p1 = petal(r, a, 0.15, 0.46, s * 0.62);
    float p2 = petal(r, b, 0.36, 0.74, s * 0.56);
    float p3 = petal(r, a, 0.6, 0.9, s * 0.34);
    o.x += stroke(p1, 0.0035) + stroke(p2, 0.0035) + stroke(p3, 0.003);
    o.x += stroke(r - 0.13, 0.003) + stroke(r - 0.93, 0.004) + stroke(r - 0.965, 0.0025);
    o.y += fill(p1 + 0.012) + fill(p3 + 0.01) * 0.85;
    o.z += fill(p2 + 0.014) * 0.9 + fill(dotRing(r, theta, 0.95, sym * 3.0, 0.009));
    o.z += fill(petal(r, a, 0.2, 0.36, s * 0.22) + 0.004) * 0.7;
    return o;
  }

  vec3 chakra(float r, float theta, float sym) {
    float a = fold(theta, sym, 0.0);
    vec2 q = vec2(cos(a), sin(a)) * r;
    vec3 o = vec3(0.0);
    // Overlapping star polygons: a line at distance R from the centre, tilted.
    float k = PI / sym;
    float l1 = q.x * cos(k * 0.5) + q.y * sin(k * 0.5) - 0.42;
    float l2 = q.x * cos(k * 1.5) + q.y * sin(k * 1.5) - 0.34;
    float l3 = q.x * cos(k * 0.5) + q.y * sin(k * 0.5) - 0.82;
    o.x += stroke(l1, 0.0035) * step(r, 0.62) + stroke(l2, 0.003) * step(r, 0.5);
    o.x += stroke(l3, 0.004) * step(r, 0.98) * step(0.55, r);
    o.x += stroke(r - 0.16, 0.0035) + stroke(r - 0.6, 0.003) + stroke(r - 0.97, 0.004);
    float diamond = abs(q.y) * 2.6 + abs(q.x - 0.74) - 0.11;
    o.x += stroke(diamond, 0.003);
    o.y += fill(diamond + 0.012);
    o.y += fill(-max(l2, -(r - 0.17))) * fill(r - 0.32) * 0.75;
    o.z += fill(l1 + 0.008) * fill(-l2 - 0.008) * 0.8;
    o.z += fill(dotRing(r, theta, 0.6, sym * 2.0, 0.011));
    o.z += fill(dotRing(r, theta + PI / sym, 0.9, sym, 0.016));
    return o;
  }

  vec3 mandala(float r, float theta, float sym) {
    float a = fold(theta, sym, 0.0);
    vec3 o = vec3(0.0);
    float w1 = r - (0.3 + 0.03 * cos(theta * sym));
    float w2 = r - (0.62 + 0.045 * cos(theta * sym * 2.0));
    o.x += stroke(w1, 0.0035) + stroke(w2, 0.0035) + stroke(r - 0.95, 0.004) + stroke(r - 0.15, 0.003);
    // Paisley-like loops between the waves.
    vec2 c = vec2(cos(a), sin(a)) * r - vec2(0.46, 0.0);
    float loop = length(c * vec2(1.0, 1.7)) - 0.075;
    o.x += stroke(loop, 0.003);
    o.y += fill(loop + 0.01);
    float leaf = petal(r, a, 0.68, 0.9, 0.38 * 6.2832 / sym);
    o.x += stroke(leaf, 0.003);
    o.z += fill(leaf + 0.01) * 0.9;
    o.z += fill(dotRing(r, theta, 0.22, sym * 2.0, 0.01));
    o.y += fill(dotRing(r, theta, 0.79, sym * 4.0, 0.006)) * 0.8;
    return o;
  }

  vec3 pattern(float kind, float r, float theta, float sym) {
    vec3 result;
    if (kind < 0.5) result = lotus(r, theta, sym);
    else if (kind < 1.5) result = chakra(r, theta, sym);
    else result = mandala(r, theta, sym);
    return result;
  }

  void main() {
    vec2 p = vPos / uRadius;
    float r = length(p);
    if (r > 1.02) discard;
    float theta = atan(p.y, p.x);

    // Two pattern states are only needed while a change is crossfading. uMix is
    // a uniform, so this branch is coherent across the draw and the steady state
    // (which is nearly all of the time) evaluates one pattern instead of two.
    vec3 m;
    vec3 accent;
    if (uMix < 0.999) {
      vec3 A = pattern(uPatternA, r, theta, uSymA);
      vec3 B = pattern(uPatternB, r, theta, uSymB);
      // Crossfade sweeps outward from the centre so a change feels drawn, not swapped.
      float sweep = smoothstep(r - 0.15, r + 0.15, uMix * 1.3);
      m = mix(A, B, sweep);
      accent = mix(uAccentA, uAccentB, sweep);
    } else {
      m = pattern(uPatternB, r, theta, uSymB);
      accent = uAccentB;
    }

    float chalk = clamp(m.x, 0.0, 1.0);
    float powderA = clamp(m.y, 0.0, 1.0) * (1.0 - chalk);
    float powderB = clamp(m.z, 0.0, 1.0) * (1.0 - chalk) * (1.0 - powderA);
    // Powder grain: one hash instead of two smoothed noise lookups.
    float grain = 0.74 + 0.46 * hash12(floor(vPos * 760.0));

    vec3 color = vec3(0.62, 0.55, 0.45) * chalk + accent * powderA + vec3(0.72, 0.47, 0.13) * powderB;
    float coverage = clamp(chalk + powderA + powderB, 0.0, 1.0);

    // Diya light. Softer than inverse-square on purpose: the drawing should read
    // from the wide shot without the area under the lamp blowing out up close.
    float dist = distance(vWorld, uFlame);
    float lit = uLight * (0.3 * exp(-dist * 1.7) + 0.05);
    // Golden wavefront that travels outward during the reveal.
    float front = uReveal * 1.18;
    float revealed = smoothstep(front, front - 0.12, r);
    float band = exp(-pow((r - front) * 9.0, 2.0)) * (1.0 - smoothstep(0.9, 1.0, uReveal));
    // Before ignition, only the chalk outline is faintly visible.
    float ambient = 0.012 * chalk + 0.004;
    float pointerGlow = 0.18 * exp(-pow(distance(vWorld.xz, uPointer.xz) * 6.0, 2.0)) * uLight;

    vec3 shaded = color * grain * (ambient + revealed * (lit + pointerGlow) * 0.9);
    shaded += vec3(1.0, 0.62, 0.2) * band * coverage * 0.9;
    // Edges of the drawing fade softly into the floor.
    float alpha = coverage * smoothstep(1.02, 0.96, r) * mix(0.55, 0.95, revealed);
    gl_FragColor = vec4(shaded, alpha);
    #include <fog_fragment>
  }
`;

export function createRangoliMaterial(flame: Vector3, radius: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uRadius: { value: radius },
      uReveal: { value: 0 },
      uLight: { value: 0 },
      uTime: { value: 0 },
      uFlame: { value: flame.clone() },
      uPointer: { value: new Vector3(1e3, 0, 1e3) },
      uPatternA: { value: 0 },
      uPatternB: { value: 0 },
      uSymA: { value: 12 },
      uSymB: { value: 12 },
      uMix: { value: 0 },
      uAccentA: { value: new Color(ACCENTS.sindoor.color) },
      uAccentB: { value: new Color(ACCENTS.sindoor.color) },
      fogColor: { value: new Color() },
      fogNear: { value: 1 },
      fogFar: { value: 100 },
      fogDensity: { value: 0 },
    },
    vertexShader: vertexShader.replace('void main() {', '#include <fog_pars_vertex>\nvoid main() {').replace(
      'gl_Position = projectionMatrix * viewMatrix * w;',
      'vec4 mvPosition = viewMatrix * w;\n    gl_Position = projectionMatrix * mvPosition;\n    #include <fog_vertex>',
    ),
    fragmentShader,
    transparent: true,
    depthWrite: false,
    fog: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
}
