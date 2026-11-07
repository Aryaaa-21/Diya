import { Vector3 } from 'three';
import { fireworkAudio } from './audio';
import { ParticleSystem, spark } from './ParticleSystem';
import { SHAPES, pickShape } from './shells';
import { choose, paletteColor, pathAt, rand, scaled, velocityFor, type Stage } from './stage';
import { MODE, SKY_GRAVITY, SKY_PALETTES, type PaletteName } from './types';
import type { FireworkShape } from '../state/store';

/**
 * The aerial pieces. These happen 8-16 m out over the rooftops, so their sparks
 * are ten centimetres across and fall slowly — stylised distance, not courtyard
 * physics (see SKY_GRAVITY).
 *
 * All three share one launch-and-break routine. A shell is written in full at
 * ignition: the climbing head, the trail dropped along its path, the break, and
 * every layer of the burst, each with its own start time. The GPU does the rest.
 */

const TAU = Math.PI * 2;
/** Base spark lifetime for a burst, scaled by the shell's own `life`. */
const BURST_LIFE = 3;
/** A spark ten centimetres across reads as a bright star at 14 m. */
const SPARK_SIZE = 0.075;
const RISE_DRAG = 0.5;
const RISE_GRAVITY = 0.3;

const velocity = new Vector3();

export interface AerialOptions {
  /** Where it leaves the ground. */
  padX: number;
  padZ: number;
  /** Where it breaks. */
  x: number;
  y: number;
  z: number;
  /** Seconds of climb. */
  rise: number;
  /** Overall burst scale: a rocket is around 0.8, a big shell 1.4. */
  scale: number;
  shape?: FireworkShape;
  palette?: PaletteName;
  /** Fuse and launch sound; false for the bursts inside a multi-shot cake. */
  launchSound?: boolean;
}

/**
 * The break, in the six layers the brief asks for: flash, primary burst,
 * trails, secondary crackle, embers, and a breath of smoke.
 */
function burst(stage: Stage, t: number, x: number, y: number, z: number, scale: number, shape: FireworkShape, palette: PaletteName): number {
  const { sys, budget } = stage;
  const spec = SHAPES[shape];
  const life = BURST_LIFE * spec.life;
  const speed = (2.4 + 1.9 * scale) * spec.speed;
  const primary = scaled(300 * spec.density * scale, budget, 30);
  // Trails hang off every other spark: enough to read as streaks, half the cost.
  const trailed = budget.trail > 0 ? Math.floor(primary / 2) : 0;
  const trails = trailed * budget.trail;
  const secondaries = budget.secondary ? 3 : 0;
  const secondary = secondaries * scaled(30 * scale, budget, 8);
  const embers = scaled(60 * scale, budget, 10);
  const smoke = budget.smoke ? scaled(9 * scale, budget, 3) : 0;
  sys.reserve(primary + trails + secondary + embers + smoke + 3);

  /**
   * A spark falls gravity·t², so how long it may burn depends on how high the
   * shell broke. Without this a willow bursting low would spend its last second
   * under the floor: particles paid for and never seen.
   */
  const maxFall = y + 1.2;
  const lifeCap = (gravity: number) => (gravity > 0.01 ? Math.sqrt(maxFall / gravity) : Infinity);
  const primaryCap = lifeCap(spec.gravity);

  // Layer 1: the flash. Short, wide and white-hot, so the burst has an onset.
  ParticleSystem.setColor('#fff8ec');
  for (let i = 0; i < 3; i++) {
    spark.x = x;
    spark.y = y;
    spark.z = z;
    spark.vx = spark.vy = spark.vz = 0;
    spark.start = t + i * 0.012;
    spark.life = 0.28 + i * 0.1;
    spark.drag = 1;
    spark.gravity = 0;
    spark.size = (0.3 + i * 0.1) * scale;
    spark.mode = MODE.flash;
    spark.bright = 1.5 - i * 0.35;
    sys.push();
  }

  // Layer 2 and 3: the shell's own geometry, each spark optionally trailing.
  for (let i = 0; i < primary; i++) {
    spec.velocity(i, primary, speed, velocity);
    ParticleSystem.setColor(paletteColor(palette, i));
    const size = SPARK_SIZE * spec.size * scale * rand(0.82, 1.18);
    const sparkLife = Math.min(life * rand(0.85, 1.1), primaryCap);
    spark.x = x;
    spark.y = y;
    spark.z = z;
    spark.vx = velocity.x;
    spark.vy = velocity.y;
    spark.vz = velocity.z;
    spark.start = t;
    spark.life = sparkLife;
    spark.drag = spec.drag;
    spark.gravity = spec.gravity;
    spark.size = size;
    spark.mode = spec.kind(i) === 2 ? MODE.twinkle : MODE.spark;
    spark.bright = 1.15;
    sys.push();

    if (i % 2 === 0 && i / 2 < trailed) {
      for (let k = 1; k <= budget.trail; k++) {
        // Same path, launched a moment later and dying sooner: a streak.
        spark.start = t + k * 0.05;
        spark.life = sparkLife * (0.62 - k * 0.1);
        spark.size = size * (0.72 - k * 0.1);
        spark.mode = MODE.spark;
        spark.bright = 0.75 - k * 0.12;
        sys.push();
      }
    }
  }

  // Layer 4: secondary crackle inside the shell, a beat after the break.
  for (let s = 0; s < secondaries; s++) {
    const count = scaled(30 * scale, budget, 8);
    const a = rand(0, TAU);
    const p = Math.acos(rand(-1, 1));
    const r = rand(0.35, 0.8) * speed * 0.35;
    const cx = x + Math.sin(p) * Math.cos(a) * r;
    const cy = y + Math.cos(p) * r;
    const cz = z + Math.sin(p) * Math.sin(a) * r;
    const at = t + rand(0.3, 0.6);
    ParticleSystem.setColor('#fff4de');
    for (let i = 0; i < count; i++) {
      const ia = rand(0, TAU);
      const ip = Math.acos(rand(-1, 1));
      const is = rand(0.3, 1) * scale;
      spark.x = cx;
      spark.y = cy;
      spark.z = cz;
      spark.vx = Math.sin(ip) * Math.cos(ia) * is;
      spark.vy = Math.cos(ip) * is;
      spark.vz = Math.sin(ip) * Math.sin(ia) * is;
      spark.start = at;
      spark.life = rand(0.35, 0.7);
      spark.drag = 2.6;
      spark.gravity = SKY_GRAVITY;
      spark.size = SPARK_SIZE * 0.6 * scale;
      spark.mode = MODE.twinkle;
      spark.bright = 1.3;
      sys.push();
    }
  }

  // Layer 5: embers, drifting down long after the shape has gone.
  for (let i = 0; i < embers; i++) {
    ParticleSystem.setColor(paletteColor(palette, i + 1));
    const a = rand(0, TAU);
    const p = Math.acos(rand(-1, 1));
    const s = rand(0.2, 0.85) * speed;
    spark.x = x;
    spark.y = y;
    spark.z = z;
    spark.vx = Math.sin(p) * Math.cos(a) * s;
    spark.vy = Math.cos(p) * s;
    spark.vz = Math.sin(p) * Math.sin(a) * s;
    spark.start = t + rand(0, 0.3);
    // Long enough to hang over the rooftops after the shape has gone, short
    // enough that they fade out above the horizon instead of under the floor.
    // Capped in absolute terms: a willow's own life is long enough that a
    // multiple of it would carry the embers well under the horizon.
    spark.life = Math.min(life * rand(1.05, 1.25), 3.6, lifeCap(SKY_GRAVITY * 1.1));
    spark.drag = spec.drag * 1.2;
    spark.gravity = SKY_GRAVITY * 1.1;
    spark.size = SPARK_SIZE * rand(0.4, 0.7) * scale;
    spark.mode = MODE.ember;
    spark.bright = 0.8;
    sys.push();
  }

  // Layer 6: the smoke the burst leaves hanging, lit from below by the city.
  ParticleSystem.setColor('#4a3328');
  for (let i = 0; i < smoke; i++) {
    const a = rand(0, TAU);
    const r = rand(0, 0.6) * scale;
    spark.x = x + Math.cos(a) * r;
    spark.y = y + rand(-0.3, 0.3);
    spark.z = z + Math.sin(a) * r;
    spark.vx = rand(-0.1, 0.1);
    spark.vy = rand(0.05, 0.2);
    spark.vz = rand(-0.1, 0.1);
    spark.start = t + rand(0.1, 0.5);
    spark.life = rand(2.6, 4);
    spark.drag = 0.6;
    spark.gravity = 0;
    spark.size = rand(0.4, 0.8) * scale;
    spark.mode = MODE.smoke;
    spark.bright = 1;
    sys.push();
  }

  stage.light(t, t + 0.55, 1.5 * scale, x, y, z);
  stage.kick(t, 0.3 + 0.45 * scale);
  return life * 1.6;
}

/** Fuse, launch, climb, trail, break. The one routine behind all three pieces. */
export function aerial(stage: Stage, t0: number, options: AerialOptions): number {
  const { sys, budget } = stage;
  const { padX, padZ, x, y, z, rise, scale } = options;
  const shape = options.shape ?? pickShape();
  const spec = SHAPES[shape];
  // Mostly the shell's own family, with an occasional accent from the sky set.
  const palette = options.palette ?? (Math.random() < 0.8 ? choose(spec.palettes) : choose(SKY_PALETTES));
  const FUSE = 0.32;
  const launch = t0 + FUSE;
  const breakAt = launch + rise;

  const trail = scaled(100 * scale, budget, 16);
  const fuseCount = scaled(10, budget, 4);
  sys.reserve(trail + fuseCount + 2);

  // The fuse at the pad: a handful of sparks before anything moves.
  ParticleSystem.setColor('#fff4de');
  for (let i = 0; i < fuseCount; i++) {
    const a = rand(0, TAU);
    spark.x = padX + rand(-0.04, 0.04);
    spark.y = 0.04;
    spark.z = padZ + rand(-0.04, 0.04);
    spark.vx = Math.cos(a) * rand(0.2, 0.7);
    spark.vy = rand(0.3, 1);
    spark.vz = Math.sin(a) * rand(0.2, 0.7);
    spark.start = t0 + rand(0, FUSE * 0.8);
    spark.life = rand(0.14, 0.3);
    spark.drag = 2.8;
    spark.gravity = 1.2;
    spark.size = rand(0.02, 0.035);
    spark.mode = MODE.twinkle;
    spark.bright = 1;
    sys.push();
  }

  // Solve for the launch velocity that puts the head exactly on the break point
  // under the same drag and gravity the shader integrates.
  const k = (1 - Math.exp(-RISE_DRAG * rise)) / RISE_DRAG;
  const vx = (x - padX) / k;
  const vz = (z - padZ) / k;
  const vy = velocityFor(y - 0.04, RISE_DRAG, RISE_GRAVITY, rise);

  // The climbing head.
  ParticleSystem.setColor('#ffd76a');
  spark.x = padX;
  spark.y = 0.04;
  spark.z = padZ;
  spark.vx = vx;
  spark.vy = vy;
  spark.vz = vz;
  spark.start = launch;
  spark.life = rise;
  spark.drag = RISE_DRAG;
  spark.gravity = RISE_GRAVITY;
  spark.size = 0.075 * scale;
  spark.mode = MODE.head;
  spark.bright = 1.4;
  sys.push();

  ParticleSystem.setColor('#fff8ec');
  spark.start = launch;
  spark.life = 0.22;
  spark.size = 0.12 * scale;
  spark.mode = MODE.flash;
  spark.bright = 0.8;
  sys.push();

  // The trail, dropped along the path the head will actually take.
  for (let i = 0; i < trail; i++) {
    const u = (i + 0.5) / trail;
    const tt = u * rise;
    const kt = (1 - Math.exp(-RISE_DRAG * tt)) / RISE_DRAG;
    ParticleSystem.setColor(i % 4 === 0 ? '#fff4de' : '#ff8a1f');
    spark.x = padX + vx * kt + rand(-0.03, 0.03);
    spark.y = 0.04 + pathAt(vy, RISE_DRAG, RISE_GRAVITY, tt);
    spark.z = padZ + vz * kt + rand(-0.03, 0.03);
    spark.vx = rand(-0.25, 0.25);
    spark.vy = rand(-0.4, 0.1);
    spark.vz = rand(-0.25, 0.25);
    spark.start = launch + tt;
    spark.life = rand(0.35, 0.75);
    spark.drag = 1.6;
    spark.gravity = 0.5;
    spark.size = rand(0.025, 0.05) * scale;
    spark.mode = i % 5 === 0 ? MODE.twinkle : MODE.spark;
    spark.bright = 0.9;
    sys.push();
  }

  stage.light(launch, launch + 0.2, 0.45, padX, 0.3, padZ);
  stage.rise(launch, rise, scale);
  const after = burst(stage, breakAt, x, y, z, scale, shape, palette);
  if (options.launchSound !== false) fireworkAudio.launch(t0 - stage.now, FUSE, rise);
  fireworkAudio.boom(breakAt - stage.now, scale, Math.hypot(x, z));
  return FUSE + rise + after;
}

/**
 * `scale` is absolute, not a multiplier: callers that pass one (the cinematic
 * timelines, the show) mean that size exactly, and a burst's angular radius has
 * to stay inside the frame — at 16 m a 3.5 m burst already fills two thirds of
 * the shot's height.
 */
export function rocket(stage: Stage, t0: number, x: number, y: number, z: number, scale?: number): number {
  return aerial(stage, t0, {
    padX: x * 0.45 + rand(-0.6, 0.6),
    padZ: Math.max(-9, z * 0.5),
    x,
    y,
    z,
    rise: rand(1.05, 1.3),
    scale: scale ?? rand(0.7, 0.9),
  });
}

export function shell(
  stage: Stage,
  t0: number,
  x: number,
  y: number,
  z: number,
  shape?: FireworkShape,
  scale?: number,
  palette?: PaletteName,
): number {
  return aerial(stage, t0, {
    padX: x * 0.5 + rand(-1, 1),
    padZ: Math.max(-11, z * 0.6),
    x,
    y,
    z,
    rise: rand(1.35, 1.6),
    scale: scale ?? rand(1, 1.25),
    shape,
    palette,
  });
}

/**
 * A cake: four shots fanned across the sky, then the big one. The gaps matter
 * more than the bursts — fired together they would read as noise.
 */
export function cake(stage: Stage, t0: number, x: number, z: number): number {
  const padX = x;
  const padZ = Math.max(-10, z);
  const gaps = [0, 0.85, 1.65, 2.45, 3.9];
  const side = Math.random() < 0.5 ? -1 : 1;
  let end = 0;
  for (let i = 0; i < gaps.length; i++) {
    const last = i === gaps.length - 1;
    // The four shots sweep outward; the finale goes straight up the middle.
    const lean = last ? 0 : side * (0.55 + i * 0.75);
    const length = aerial(stage, t0 + gaps[i], {
      padX,
      padZ,
      x: padX + lean,
      y: last ? rand(3.9, 4.4) : rand(2.9, 3.7),
      z: padZ - rand(1.5, 3),
      rise: last ? 1.5 : rand(0.95, 1.15),
      scale: last ? 1.35 : rand(0.6, 0.78),
      shape: last ? 'peony' : undefined,
      launchSound: i === 0 || last,
    });
    end = Math.max(end, gaps[i] + length);
  }
  return end;
}
