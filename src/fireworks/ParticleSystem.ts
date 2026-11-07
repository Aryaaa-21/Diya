import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Points,
  ShaderMaterial,
} from 'three';
import { MODE } from './types';

/**
 * One pooled, GPU-animated particle buffer for every firework in the scene.
 *
 * Nothing moves on the CPU. A particle's whole life — rise, drag, gravity,
 * fade, twinkle — is a closed-form function of (origin, velocity, start, life)
 * evaluated in the vertex shader, so a piece that burns for five seconds is
 * written once at ignition and then costs zero CPU time. That is what lets a
 * fountain, a spinning chakri and a shell burst share a single draw call and
 * still emit continuously: "continuous" is just a slice of particles with
 * staggered start times.
 *
 * Slots are handed out from a ring. When a piece doesn't fit in the tail of the
 * buffer the cursor jumps back to zero, overwriting the oldest particles, which
 * is both the pool's recycling rule and the brief's "prioritise the newest
 * effect" behaviour under pressure.
 */

/**
 * Scratch particle. Emitters fill this and call `push`, so writing ten thousand
 * particles allocates nothing.
 */
export const spark = {
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  r: 1,
  g: 0.84,
  b: 0.45,
  /** Absolute scene time (the same clock the shader reads) at which it lights. */
  start: 0,
  life: 1,
  /** Exponential velocity decay; high values stop the particle almost at once. */
  drag: 1.4,
  /** Downward pull. The shader's fall term is gravity·age², so this is ½g. */
  gravity: 0,
  /** Radius in metres. Pixel size is derived from this and the distance. */
  size: 0.02,
  mode: MODE.spark as number,
  /** Multiplier on final alpha, 0..2. */
  bright: 1,
};

export type Spark = typeof spark;

const vertexShader = /* glsl */ `
  attribute vec3 aOrigin;
  attribute vec3 aVelocity;
  attribute vec3 aColor;
  attribute vec4 aLife;  // x start, y life, z drag, w gravity
  attribute vec4 aStyle; // x size (metres), y mode, z brightness, w seed
  uniform float uTime;
  uniform float uProj;  // pixels per metre at one metre: height / (2 tan(fov/2))
  uniform float uFade;  // global dim, used by transitions and reduced motion
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSoft;

  void main() {
    float age = uTime - aLife.x;
    float life = max(aLife.y, 0.001);
    vec3 p = aOrigin;
    float alpha = 0.0;
    float size = 0.0;
    float soft = 1.8;
    float white = 0.0;

    if (age >= 0.0 && age <= life) {
      float u = age / life;
      float fade = 1.0 - u;
      float drag = max(aLife.z, 0.001);
      // Velocity under exponential drag, then a quadratic fall.
      p += aVelocity * ((1.0 - exp(-drag * age)) / drag) - vec3(0.0, aLife.w * age * age, 0.0);

      float m = aStyle.y;
      float seed = aStyle.w;
      if (m < 0.5) {
        // Spark: the body of every burst and fountain.
        alpha = pow(fade, 1.5);
        size = mix(1.0, 0.45, u);
      } else if (m < 1.5) {
        // Twinkle: the same, strobing on and off like a crackling star.
        float strobe = step(0.38, fract(sin(seed * 91.7 + uTime * 13.0) * 43758.5453));
        alpha = pow(fade, 1.2) * strobe;
        size = mix(1.0, 0.5, u);
      } else if (m < 2.5) {
        // Flash: the short, wide, white-hot bloom at an ignition or a break.
        alpha = exp(-u * 4.2) * fade;
        size = mix(0.55, 2.4, sqrt(u));
        soft = 2.9;
        white = fade;
      } else if (m < 3.5) {
        // Ember: dim, slow, flickering; what is left once a burst has gone.
        float tw = 0.55 + 0.45 * sin(uTime * (9.0 + seed * 14.0) + seed * 60.0);
        alpha = pow(fade, 2.0) * tw;
        size = mix(0.8, 0.35, u);
      } else if (m < 4.5) {
        // Smoke: a very faint warm haze that drifts up and spreads.
        alpha = sin(3.14159 * u) * 0.085;
        size = mix(1.0, 3.6, u);
        soft = 1.1;
        p += vec3(sin(seed * 30.0 + age * 0.5), 0.55, cos(seed * 21.0 + age * 0.4)) * age * 0.22;
      } else {
        // Head: a rocket or shell climbing, flickering as it burns.
        alpha = (0.75 + 0.25 * sin(uTime * 48.0 + seed * 30.0)) * (1.0 - smoothstep(0.7, 1.0, u));
        size = 1.0;
        white = 0.45;
      }
      alpha *= aStyle.z * uFade;
    }

    if (alpha < 0.002) {
      // Dead slot: park it outside clip space so it is never rasterised.
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      vAlpha = 0.0;
      vColor = vec3(0.0);
      vSoft = 1.0;
      return;
    }

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    // True perspective sizing: one radius in metres reads correctly whether the
    // particle is a 1 cm spark at arm's length or a 10 cm star 14 m away.
    gl_PointSize = clamp(aStyle.x * size * uProj / max(-mv.z, 0.05), 1.0, 72.0);
    vColor = mix(aColor, vec3(1.0, 0.96, 0.86), white);
    vAlpha = alpha;
    vSoft = soft;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSoft;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = pow(max(0.0, 1.0 - d), vSoft);
    if (a <= 0.0) discard;
    gl_FragColor = vec4(vColor * a * vAlpha, 1.0);
  }
`;

const DEAD = -1e4;
const scratch = new Color();

export class ParticleSystem {
  readonly points: Points;
  readonly capacity: number;

  private readonly origin: BufferAttribute;
  private readonly velocity: BufferAttribute;
  private readonly color: BufferAttribute;
  private readonly life: BufferAttribute;
  private readonly style: BufferAttribute;
  private readonly material: ShaderMaterial;
  private readonly geometry: BufferGeometry;

  /** Next free slot. */
  private head = 0;
  /** Highest slot ever written since the pool last went quiet. */
  private highWater = 0;
  /** End of the current reservation; `push` stops here. */
  private cursor = 0;
  private limit = 0;
  /** Scene time at which the last particle in flight dies. */
  private liveUntil = -1;
  private dirtyFrom = Infinity;
  private dirtyTo = -Infinity;

  constructor(capacity: number) {
    this.capacity = capacity;
    const attribute = (size: number, fill?: number) => {
      const array = new Float32Array(capacity * size);
      if (fill !== undefined) array.fill(fill);
      const a = new BufferAttribute(array, size);
      a.setUsage(DynamicDrawUsage);
      return a;
    };
    this.origin = attribute(3);
    this.velocity = attribute(3);
    this.color = attribute(3);
    // Start time DEAD keeps every slot outside its own lifetime window.
    this.life = attribute(4, DEAD);
    this.style = attribute(4);

    const geometry = new BufferGeometry();
    // `position` is unused by the shader but three.js needs it to count vertices.
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(capacity * 3), 3));
    geometry.setAttribute('aOrigin', this.origin);
    geometry.setAttribute('aVelocity', this.velocity);
    geometry.setAttribute('aColor', this.color);
    geometry.setAttribute('aLife', this.life);
    geometry.setAttribute('aStyle', this.style);
    geometry.setDrawRange(0, 0);
    this.geometry = geometry;

    this.material = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uProj: { value: 800 }, uFade: { value: 1 } },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      // Additive glows stay bright through the scene's distance fog.
      fog: false,
    });

    this.points = new Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = -5;
    this.points.visible = false;
  }

  /**
   * Reserve `count` contiguous slots. Returns the number actually reserved,
   * which is `count` unless the request exceeds the whole pool.
   */
  reserve(count: number): number {
    const n = Math.min(count, this.capacity);
    if (n <= 0) return 0;
    if (this.head + n > this.capacity) {
      // Not enough room in the tail: start over and overwrite the oldest.
      this.head = 0;
      this.dirtyFrom = 0;
      this.dirtyTo = this.capacity;
    }
    this.cursor = this.head;
    this.limit = this.head + n;
    this.head = this.limit;
    if (this.head > this.highWater) this.highWater = this.head;
    return n;
  }

  /** Write the scratch `spark` into the next reserved slot. */
  push(): void {
    if (this.cursor >= this.limit) return;
    const i = this.cursor++;
    this.origin.setXYZ(i, spark.x, spark.y, spark.z);
    this.velocity.setXYZ(i, spark.vx, spark.vy, spark.vz);
    this.color.setXYZ(i, spark.r, spark.g, spark.b);
    this.life.setXYZW(i, spark.start, spark.life, spark.drag, spark.gravity);
    this.style.setXYZW(i, spark.size, spark.mode, spark.bright, Math.random());
    if (i < this.dirtyFrom) this.dirtyFrom = i;
    if (i + 1 > this.dirtyTo) this.dirtyTo = i + 1;
    const end = spark.start + spark.life;
    if (end > this.liveUntil) this.liveUntil = end;
  }

  /** Convenience for emitters: set the colour from a CSS string. */
  static setColor(hex: string): void {
    scratch.set(hex);
    spark.r = scratch.r;
    spark.g = scratch.g;
    spark.b = scratch.b;
  }

  /**
   * Per-frame bookkeeping: push this frame's writes to the GPU, update the
   * clock, and stop drawing entirely once the last particle has died.
   */
  frame(now: number, proj: number, fade: number): void {
    const u = this.material.uniforms;
    u.uTime.value = now;
    u.uProj.value = proj;
    u.uFade.value = fade;

    if (this.dirtyTo > this.dirtyFrom) {
      for (const a of [this.origin, this.velocity, this.color, this.life, this.style]) {
        a.clearUpdateRanges();
        a.addUpdateRange(this.dirtyFrom * a.itemSize, (this.dirtyTo - this.dirtyFrom) * a.itemSize);
        a.needsUpdate = true;
      }
      this.dirtyFrom = Infinity;
      this.dirtyTo = -Infinity;
    }

    const live = now <= this.liveUntil;
    if (!live && this.highWater > 0) {
      // Nothing in flight: rewind the ring so the next quiet spell draws nothing.
      this.head = 0;
      this.highWater = 0;
    }
    this.points.visible = live;
    this.geometry.setDrawRange(0, live ? this.highWater : 0);
  }

  /** Kill everything immediately (leaving the mode, or a reduced-motion cut). */
  clear(): void {
    this.life.array.fill(DEAD);
    this.life.needsUpdate = true;
    this.life.clearUpdateRanges();
    this.head = 0;
    this.highWater = 0;
    this.liveUntil = -1;
    this.points.visible = false;
    this.geometry.setDrawRange(0, 0);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
