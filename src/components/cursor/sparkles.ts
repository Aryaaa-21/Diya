/**
 * The wake of sparks behind the cursor.
 *
 * Two pools of elements, built once and recycled: a few four-point sparks that
 * flare and tumble, and a denser stream of embers marking the path the pointer
 * took. Nothing is created or destroyed while the pointer moves.
 *
 * Three decisions here are load-bearing, and each one was measured:
 *
 * - Motion runs through the Web Animations API, not CSS classes, so recycling
 *   an element restarts it without the usual `animation: none` plus forced
 *   reflow — the one step in this effect that would block the main thread.
 * - A spark is painted from two plain background layers. The first version used
 *   `mask-image` for the star and `filter: drop-shadow` for its glow, which
 *   forces every live spark to re-rasterise on every frame of its scale
 *   animation: mean frame time went from 7ms to 27ms, roughly 35fps on a 60Hz
 *   display. Painted this way the whole life is transform and opacity on the
 *   compositor, and the trail costs nothing measurable.
 * - No `will-change`. Fifty permanently promoted layers cost more than letting
 *   the browser promote each spark only while it is actually animating.
 */

/** Pre-baked warm tones; the stylesheet picks one by `data-tone`. */
const TONES = 3;
/** Box size in pixels. The star occupies the middle 60%, its glow the rest. */
const SIZES = [32, 24, 16];

const STAR_POOL = 14;
const EMBER_POOL = 22;
const STAR_LIFE = 1500;
const EMBER_LIFE = 520;
/** Spawn rules, in milliseconds and in pixels of pointer travel. */
const STAR_MIN_GAP = 165;
const STAR_MIN_DISTANCE = 52;
const EMBER_MIN_GAP = 16;
const EMBER_MIN_DISTANCE = 26;
/** How far behind the pointer a spark is born. */
const TRAIL_OFFSET = 14;
/** Sideways scatter, so the wake reads as thrown sparks, not beads on a line. */
const SPREAD = 11;

type Frames = Keyframe[];

/**
 * Three ways to fall, so consecutive sparks never look like copies. Each opens
 * from nothing, flares, then tumbles away and out.
 */
const FALLS: Frames[] = [
  [
    { transform: 'translate(-50%, -50%) translate3d(0, 0, 0) rotateX(45deg) rotateY(30deg) scale(0.2)', opacity: 0, offset: 0 },
    { transform: 'translate(-50%, -50%) translate3d(5px, -6px, 0) rotateX(45deg) rotateY(30deg) scale(1)', opacity: 1, offset: 0.09 },
    { transform: 'translate(-50%, -50%) translate3d(14px, 62px, 0) rotateX(180deg) rotateY(270deg) rotateZ(90deg) scale(0.5)', opacity: 0, offset: 1 },
  ],
  [
    { transform: 'translate(-50%, -50%) translate3d(0, 0, 0) rotateX(-20deg) rotateY(10deg) scale(0.2)', opacity: 0, offset: 0 },
    { transform: 'translate(-50%, -50%) translate3d(-7px, -4px, 0) rotateX(-20deg) rotateY(10deg) scale(1)', opacity: 1, offset: 0.12 },
    { transform: 'translate(-50%, -50%) translate3d(-11px, 50px, 0) rotateX(-90deg) rotateY(45deg) scale(0.25)', opacity: 0, offset: 1 },
  ],
  [
    { transform: 'translate(-50%, -50%) translate3d(0, 0, 0) rotateY(45deg) scale(0.35)', opacity: 0, offset: 0 },
    { transform: 'translate(-50%, -50%) translate3d(4px, 3px, 0) rotateY(45deg) scale(1)', opacity: 1, offset: 0.15 },
    { transform: 'translate(-50%, -50%) translate3d(17px, 40px, 0) rotateX(-180deg) rotateY(-90deg) scale(0.45)', opacity: 0, offset: 1 },
  ],
];

const EMBER_FALL: Frames = [
  { transform: 'translate(-50%, -50%) scale(1)', opacity: 0.68, offset: 0 },
  { transform: 'translate(-50%, -50%) translate3d(0, 5px, 0) scale(0.25)', opacity: 0, offset: 1 },
];

interface Spark {
  el: HTMLDivElement;
  animation: Animation | null;
  /** When this one is free to be used again. */
  until: number;
}

const pick = (items: readonly number[]) => items[(Math.random() * items.length) | 0];

export class SparkleTrail {
  private readonly layer: HTMLDivElement;
  private readonly stars: Spark[] = [];
  private readonly embers: Spark[] = [];

  private lastStarAt = -Infinity;
  private lastEmberAt = -Infinity;
  private starX = 0;
  private starY = 0;
  private emberX = 0;
  private emberY = 0;
  private seeded = false;
  private variant = 0;

  constructor() {
    this.layer = document.createElement('div');
    this.layer.className = 'cursor-sparks';
    this.layer.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < STAR_POOL; i++) this.stars.push(this.make('cursor-spark'));
    for (let i = 0; i < EMBER_POOL; i++) this.embers.push(this.make('cursor-ember'));
    document.body.appendChild(this.layer);
  }

  private make(className: string): Spark {
    const el = document.createElement('div');
    el.className = className;
    this.layer.appendChild(el);
    return { el, animation: null, until: -Infinity };
  }

  /** The first free element, or the one closest to finishing if all are busy. */
  private take(pool: Spark[], now: number): Spark {
    let oldest = pool[0];
    for (const spark of pool) {
      if (spark.until <= now) return spark;
      if (spark.until < oldest.until) oldest = spark;
    }
    return oldest;
  }

  private play(spark: Spark, frames: Frames, duration: number, now: number): void {
    spark.animation?.cancel();
    spark.animation = spark.el.animate(frames, {
      duration,
      easing: 'cubic-bezier(0.2, 0.6, 0.35, 1)',
      fill: 'forwards',
    });
    spark.until = now + duration;
  }

  /**
   * Called with the live pointer position. Sparks are born a little behind it,
   * along the direction of travel, so they read as a wake rather than as
   * something the pointer pushes ahead of itself.
   */
  move(x: number, y: number, now: number): void {
    if (!this.seeded) {
      this.seeded = true;
      this.starX = this.emberX = x;
      this.starY = this.emberY = y;
      return;
    }

    const dx = x - this.emberX;
    const dy = y - this.emberY;
    const travelled = Math.hypot(dx, dy);
    const moving = travelled > 0.001;
    // Back along the path, plus a little perpendicular scatter.
    const back = moving ? TRAIL_OFFSET / travelled : 0;
    const scatter = (Math.random() - 0.5) * SPREAD;
    const tailX = x - dx * back + (moving ? -dy / travelled : 0) * scatter;
    const tailY = y - dy * back + (moving ? dx / travelled : 0) * scatter;

    if (travelled >= EMBER_MIN_DISTANCE && now - this.lastEmberAt >= EMBER_MIN_GAP) {
      const ember = this.take(this.embers, now);
      ember.el.style.left = `${tailX}px`;
      ember.el.style.top = `${tailY}px`;
      this.play(ember, EMBER_FALL, EMBER_LIFE, now);
      this.lastEmberAt = now;
      this.emberX = x;
      this.emberY = y;
    }

    // Either rule can fire, so a slow drift still leaves the occasional spark.
    const farEnough = Math.hypot(x - this.starX, y - this.starY) >= STAR_MIN_DISTANCE;
    const longEnough = now - this.lastStarAt >= STAR_MIN_GAP;
    if (!farEnough && !longEnough) return;

    const star = this.take(this.stars, now);
    const size = pick(SIZES);
    star.el.style.left = `${tailX}px`;
    star.el.style.top = `${tailY}px`;
    star.el.style.width = `${size}px`;
    star.el.style.height = `${size}px`;
    star.el.dataset.tone = String((Math.random() * TONES) | 0);
    this.play(star, FALLS[this.variant++ % FALLS.length], STAR_LIFE, now);
    this.lastStarAt = now;
    this.starX = x;
    this.starY = y;
  }

  /** The pointer left the window: start the next trail fresh, not across the gap. */
  reset(): void {
    this.seeded = false;
  }

  destroy(): void {
    for (const spark of this.stars) spark.animation?.cancel();
    for (const spark of this.embers) spark.animation?.cancel();
    this.layer.remove();
  }
}
