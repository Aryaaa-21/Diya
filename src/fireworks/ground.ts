import { fireworkAudio } from './audio';
import { ParticleSystem, spark } from './ParticleSystem';
import { choose, paletteColor, rand, scaled, type Stage } from './stage';
import { GROUND_GRAVITY, GROUND_PALETTES, MODE } from './types';

/**
 * The courtyard pieces: anar, chakri, phuljhadi. These burn a metre or two from
 * the diya, at the diya's scale, so they use true gravity and centimetre-sized
 * sparks with short lives — which is exactly what makes them read as real fire
 * rather than as a scaled-down sky burst.
 *
 * Every piece follows the same physical beat: fuse, ignition, swell, climax,
 * taper, embers, smoke. The fuse is what sells "I lit this".
 */

const TAU = Math.PI * 2;

/** Fuse sparks and the first flare at the base of a piece about to go. */
function fuse(stage: Stage, t0: number, x: number, y: number, z: number, count: number): void {
  const { sys } = stage;
  ParticleSystem.setColor('#fff4de');
  for (let i = 0; i < count; i++) {
    spark.x = x + rand(-0.012, 0.012);
    spark.y = y + rand(0, 0.02);
    spark.z = z + rand(-0.012, 0.012);
    const a = rand(0, TAU);
    const s = rand(0.25, 0.8);
    spark.vx = Math.cos(a) * s;
    spark.vy = rand(0.3, 1.1);
    spark.vz = Math.sin(a) * s;
    spark.start = t0 + rand(0, 0.3);
    spark.life = rand(0.1, 0.22);
    spark.drag = 3.6;
    spark.gravity = GROUND_GRAVITY;
    spark.size = rand(0.005, 0.009);
    spark.mode = i % 3 === 0 ? MODE.twinkle : MODE.spark;
    spark.bright = 1.1;
    sys.push();
  }
}

/** The swell: 0 at ignition, 1 through the middle, tapering to a trickle. */
function envelope(u: number): number {
  const up = Math.min(1, u / 0.16);
  const down = u < 0.7 ? 1 : 1 - ((u - 0.7) / 0.3) * 0.82;
  return up * down;
}

export function anar(stage: Stage, t0: number, x: number, z: number): number {
  const { sys, budget } = stage;
  const y = 0.012;
  const FUSE = 0.34;
  const BURN = 3.5;
  /** Includes the embers and the smoke, which outlast the fountain. */
  const total = 6.9;

  const jets = scaled(1200, budget, 70);
  const embers = scaled(26, budget, 6);
  const smoke = budget.smoke ? scaled(8, budget, 3) : 0;
  const fuseCount = scaled(14, budget, 5);
  const core = scaled(18, budget, 5);
  if (!sys.reserve(jets + embers + smoke + fuseCount + core + 2)) return total;

  fuse(stage, t0, x, y, z, fuseCount);

  // Two flares: the catch, and the moment the pot is fully alight.
  ParticleSystem.setColor('#fff8ec');
  for (let i = 0; i < 2; i++) {
    spark.x = x;
    spark.y = y + 0.02;
    spark.z = z;
    spark.vx = spark.vy = spark.vz = 0;
    spark.start = t0 + (i === 0 ? FUSE : FUSE + 0.5);
    spark.life = i === 0 ? 0.3 : 0.45;
    spark.drag = 1;
    spark.gravity = 0;
    spark.size = i === 0 ? 0.05 : 0.075;
    spark.mode = MODE.flash;
    spark.bright = i === 0 ? 0.9 : 0.7;
    sys.push();
  }

  // The mouth of the pot, glowing for as long as it burns.
  const palette = choose(GROUND_PALETTES);
  for (let i = 0; i < core; i++) {
    ParticleSystem.setColor(paletteColor(palette, i));
    spark.x = x + rand(-0.018, 0.018);
    spark.y = y + rand(0, 0.03);
    spark.z = z + rand(-0.018, 0.018);
    spark.vx = spark.vy = spark.vz = 0;
    spark.start = t0 + FUSE + rand(0, 0.3);
    spark.life = rand(BURN * 0.6, BURN);
    spark.drag = 1;
    spark.gravity = 0;
    spark.size = rand(0.02, 0.038);
    spark.mode = MODE.ember;
    spark.bright = 0.8;
    sys.push();
  }

  // The fountain itself: a narrow cone, swelling and then falling away.
  for (let i = 0; i < jets; i++) {
    const u = (i + 0.5) / jets;
    const e = envelope(u);
    ParticleSystem.setColor(paletteColor(palette, i));
    const a = rand(0, TAU);
    // A tight cone, with the occasional spark thrown wider and higher.
    const wild = Math.random() < 0.12;
    const spread = wild ? rand(0.18, 0.3) : rand(0.02, 0.15);
    const speed = rand(4.4, 6.4) * (0.45 + 0.55 * e) * (wild ? 1.25 : 1);
    spark.x = x + rand(-0.012, 0.012);
    spark.y = y + 0.025;
    spark.z = z + rand(-0.012, 0.012);
    spark.vx = Math.cos(a) * Math.sin(spread) * speed;
    spark.vy = Math.cos(spread) * speed;
    spark.vz = Math.sin(a) * Math.sin(spread) * speed;
    spark.start = t0 + FUSE + u * BURN;
    // Burn out at about the moment it lands. Solving y(t)=0 exactly is not worth
    // it per particle; v/(0.45v + g) is within a few percent under this drag.
    spark.life = Math.min(rand(0.52, 0.86), (speed / (0.45 * speed + GROUND_GRAVITY)) * rand(0.86, 1.06));
    spark.drag = 0.9;
    spark.gravity = GROUND_GRAVITY;
    spark.size = rand(0.011, 0.019) * (0.8 + 0.3 * e);
    spark.mode = i % 7 === 0 ? MODE.twinkle : MODE.spark;
    spark.bright = 0.85 + 0.5 * e;
    sys.push();
  }

  // What is left: embers tumbling around the base.
  ParticleSystem.setColor('#ff8a1f');
  for (let i = 0; i < embers; i++) {
    const a = rand(0, TAU);
    const r = rand(0.05, 0.3);
    spark.x = x + Math.cos(a) * r;
    spark.y = y + rand(0.02, 0.25);
    spark.z = z + Math.sin(a) * r;
    spark.vx = Math.cos(a) * 0.1;
    spark.vy = rand(-0.1, 0.25);
    spark.vz = Math.sin(a) * 0.1;
    spark.start = t0 + FUSE + rand(BURN * 0.45, BURN + 0.3);
    spark.life = rand(0.9, 1.8);
    spark.drag = 1.6;
    // Drag-dominated, like the chakri's: they drift down and go out, they do
    // not rain through the floor.
    spark.gravity = 0.3;
    spark.size = rand(0.007, 0.013);
    spark.mode = MODE.ember;
    spark.bright = 0.7;
    sys.push();
  }

  ParticleSystem.setColor('#6b4a38');
  for (let i = 0; i < smoke; i++) {
    spark.x = x + rand(-0.06, 0.06);
    spark.y = y + 0.1;
    spark.z = z + rand(-0.06, 0.06);
    spark.vx = rand(-0.06, 0.06);
    spark.vy = rand(0.1, 0.25);
    spark.vz = rand(-0.06, 0.06);
    spark.start = t0 + FUSE + rand(0.2, BURN);
    spark.life = rand(2, 3.2);
    spark.drag = 0.7;
    spark.gravity = 0;
    spark.size = rand(0.1, 0.18);
    spark.mode = MODE.smoke;
    spark.bright = 1;
    sys.push();
  }

  // One warm light for the whole burn, brightest in the middle.
  stage.light(t0 + FUSE, t0 + FUSE + BURN + 0.4, 1, x, y + 0.35, z);
  stage.kick(t0 + FUSE, 0.12);
  fireworkAudio.anar(t0 - stage.now, FUSE, BURN);
  return total;
}

export function chakri(stage: Stage, t0: number, x: number, z: number): number {
  const { sys, budget } = stage;
  const y = 0.016;
  const FUSE = 0.3;
  const BURN = 3.6;
  const total = 6.2;
  const WHEEL = 0.085;
  /** Three nozzles, like the real thing: the ring of sparks never has a gap. */
  const NOZZLES = 3;

  const steps = scaled(230, budget, 30);
  const fuseCount = scaled(12, budget, 4);
  const embers = scaled(20, budget, 5);
  const smoke = budget.smoke ? scaled(5, budget, 2) : 0;
  const sparks = steps * NOZZLES;
  if (!sys.reserve(sparks + fuseCount + embers + smoke + 5)) return total;

  fuse(stage, t0, x, y, z, fuseCount);

  const palette = choose(GROUND_PALETTES);
  // Spin up fast, hold with a wobble, wind down: integrate it as we emit so the
  // sparks leave from exactly where the wheel is pointing.
  const dt = BURN / steps;
  let theta = rand(0, TAU);
  for (let i = 0; i < steps; i++) {
    const u = (i + 0.5) / steps;
    const spin = Math.min(1, u / 0.14) * (u < 0.68 ? 1 : Math.max(0.05, 1 - (u - 0.68) / 0.32));
    const omega = 17 * spin * (1 + 0.06 * Math.sin(u * 40));
    theta += omega * dt;
    const te = t0 + FUSE + u * BURN;
    for (let n = 0; n < NOZZLES; n++) {
      const a = theta + (n / NOZZLES) * TAU;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      ParticleSystem.setColor(paletteColor(palette, i + n));
      // Thrown along the tangent as well as outward: the signature curved spray.
      const out = rand(1.1, 2.3) * (0.5 + 0.5 * spin);
      const tangent = omega * WHEEL * 1.15;
      spark.x = x + cos * WHEEL;
      spark.y = y + rand(0, 0.015);
      spark.z = z + sin * WHEEL;
      spark.vx = cos * out - sin * tangent;
      spark.vy = rand(0.25, 1.1) * (0.4 + 0.6 * spin);
      spark.vz = sin * out + cos * tangent;
      spark.start = te;
      spark.life = rand(0.22, 0.46);
      spark.drag = 2.3;
      // Specks this small reach terminal velocity almost at once, so full
      // gravity would rain them through the floor; this is the drag-dominated
      // fall that reads correctly for an ember.
      spark.gravity = 1.8;
      spark.size = rand(0.009, 0.015);
      spark.mode = (i + n) % 6 === 0 ? MODE.twinkle : MODE.spark;
      spark.bright = 0.9 + 0.5 * spin;
      sys.push();
    }
  }

  // The hub: a bright smear that lasts the whole spin.
  ParticleSystem.setColor('#fff4de');
  for (let i = 0; i < 5; i++) {
    spark.x = x + rand(-0.02, 0.02);
    spark.y = y + 0.01;
    spark.z = z + rand(-0.02, 0.02);
    spark.vx = spark.vy = spark.vz = 0;
    spark.start = t0 + FUSE;
    spark.life = BURN * rand(0.7, 1);
    spark.drag = 1;
    spark.gravity = 0;
    spark.size = rand(0.03, 0.05);
    spark.mode = i === 0 ? MODE.flash : MODE.ember;
    spark.bright = i === 0 ? 0.8 : 0.6;
    sys.push();
  }

  ParticleSystem.setColor('#ffcf5a');
  for (let i = 0; i < embers; i++) {
    const a = rand(0, TAU);
    const r = rand(0.1, 0.45);
    spark.x = x + Math.cos(a) * r;
    spark.y = y + rand(0.01, 0.1);
    spark.z = z + Math.sin(a) * r;
    spark.vx = spark.vy = spark.vz = 0;
    spark.start = t0 + FUSE + rand(BURN * 0.5, BURN + 0.2);
    spark.life = rand(0.7, 1.6);
    spark.drag = 2;
    spark.gravity = 0.18;
    spark.size = rand(0.006, 0.011);
    spark.mode = MODE.ember;
    spark.bright = 0.6;
    sys.push();
  }

  ParticleSystem.setColor('#6b4a38');
  for (let i = 0; i < smoke; i++) {
    spark.x = x + rand(-0.08, 0.08);
    spark.y = y + 0.06;
    spark.z = z + rand(-0.08, 0.08);
    spark.vx = rand(-0.05, 0.05);
    spark.vy = rand(0.08, 0.2);
    spark.vz = rand(-0.05, 0.05);
    spark.start = t0 + FUSE + rand(0.4, BURN);
    spark.life = rand(1.8, 2.8);
    spark.drag = 0.7;
    spark.gravity = 0;
    spark.size = rand(0.09, 0.15);
    spark.mode = MODE.smoke;
    spark.bright = 1;
    sys.push();
  }

  stage.light(t0 + FUSE, t0 + FUSE + BURN + 0.3, 0.75, x, y + 0.12, z);
  fireworkAudio.chakri(t0 - stage.now, FUSE, BURN);
  return total;
}

export function phuljhadi(stage: Stage, t0: number, x: number, z: number): number {
  const { sys, budget } = stage;
  // Planted in the courtyard, burning at about knee height.
  const y = 0.22;
  const FUSE = 0.25;
  const BURN = 4.4;
  const total = 6.7;

  const sparks = scaled(950, budget, 70);
  const fuseCount = scaled(8, budget, 3);
  const smoke = budget.smoke ? scaled(4, budget, 2) : 0;
  if (!sys.reserve(sparks + fuseCount + smoke + 3)) return total;

  fuse(stage, t0, x, y, z, fuseCount);

  // The tip: one continuous white-hot point for the whole burn.
  ParticleSystem.setColor('#fff8ec');
  spark.x = x;
  spark.y = y;
  spark.z = z;
  spark.vx = spark.vy = spark.vz = 0;
  spark.start = t0 + FUSE;
  spark.life = BURN;
  spark.drag = 1;
  spark.gravity = 0;
  spark.size = 0.016;
  spark.mode = MODE.head;
  spark.bright = 1.5;
  sys.push();

  ParticleSystem.setColor('#ffffff');
  spark.start = t0 + FUSE;
  spark.life = 0.3;
  spark.size = 0.04;
  spark.mode = MODE.flash;
  spark.bright = 0.7;
  sys.push();

  // Short, bright, scattershot: a sparkler is almost all fizz, barely any arc.
  for (let i = 0; i < sparks; i++) {
    const u = (i + 0.5) / sparks;
    // Sparklers burn hottest in the middle of the stick.
    const e = 0.72 + 0.28 * Math.sin(Math.PI * u);
    ParticleSystem.setColor(i % 3 === 0 ? '#fff8ec' : paletteColor('gold', i));
    const a = rand(0, TAU);
    const p = Math.acos(rand(-0.75, 1));
    const s = rand(0.5, 1.5) * e;
    spark.x = x + rand(-0.008, 0.008);
    spark.y = y + rand(-0.008, 0.008);
    spark.z = z + rand(-0.008, 0.008);
    spark.vx = Math.sin(p) * Math.cos(a) * s;
    spark.vy = Math.cos(p) * s + 0.25;
    spark.vz = Math.sin(p) * Math.sin(a) * s;
    spark.start = t0 + FUSE + u * BURN;
    spark.life = rand(0.11, 0.3);
    spark.drag = 3.4;
    spark.gravity = GROUND_GRAVITY;
    spark.size = rand(0.006, 0.012);
    spark.mode = i % 2 === 0 ? MODE.twinkle : MODE.spark;
    spark.bright = 1.2 * e;
    sys.push();
  }

  ParticleSystem.setColor('#6b4a38');
  for (let i = 0; i < smoke; i++) {
    spark.x = x + rand(-0.03, 0.03);
    spark.y = y + 0.05;
    spark.z = z + rand(-0.03, 0.03);
    spark.vx = rand(-0.04, 0.04);
    spark.vy = rand(0.12, 0.22);
    spark.vz = rand(-0.04, 0.04);
    spark.start = t0 + FUSE + rand(0.5, BURN);
    spark.life = rand(1.6, 2.4);
    spark.drag = 0.7;
    spark.gravity = 0;
    spark.size = rand(0.06, 0.1);
    spark.mode = MODE.smoke;
    spark.bright = 1;
    sys.push();
  }

  stage.light(t0 + FUSE, t0 + FUSE + BURN, 0.5, x, y + 0.1, z);
  fireworkAudio.phuljhadi(t0 - stage.now, FUSE, BURN);
  return total;
}
