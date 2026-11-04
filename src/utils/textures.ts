import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, RepeatWrapping, SRGBColorSpace } from 'three';

/** Deterministic PRNG so the generated clay is identical on every load. */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 256;
const H = 128;

/**
 * Lathe UVs run u around the bowl and v along the profile (outside base -> inside floor).
 * These bands, in v, decide what each part of the lamp is made of.
 */
const BANDS = {
  footEnd: 0.21,
  paintStart: 0.36,
  paintEnd: 0.42,
  rimStart: 0.5,
  rimEnd: 0.68,
};

interface DiyaTextures {
  map: CanvasTexture;
  /** G = roughness, B = metalness, as three.js expects. */
  surface: CanvasTexture;
  bump: CanvasTexture;
}

function makeCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  return [canvas, canvas.getContext('2d')!];
}

function finish(canvas: HTMLCanvasElement, srgb: boolean): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 4;
  return texture;
}

let cached: DiyaTextures | null = null;

/** 256x128 procedural clay and brass: three small canvases instead of downloaded maps. */
export function getDiyaTextures(): DiyaTextures {
  if (cached) return cached;
  const random = mulberry32(1987);
  const [colorCanvas, color] = makeCanvas();
  const [surfaceCanvas, surface] = makeCanvas();
  const [bumpCanvas, bump] = makeCanvas();

  const colorData = color.createImageData(W, H);
  const surfaceData = surface.createImageData(W, H);
  const bumpData = bump.createImageData(W, H);

  for (let y = 0; y < H; y++) {
    // Canvas y=0 is the top of the texture, which maps to v=1.
    const v = 1 - y / (H - 1);
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const grain = random();
      const u = x / W;
      const blotch = 0.5 + 0.25 * Math.sin(u * Math.PI * 6 + v * 9) + 0.25 * Math.sin(u * Math.PI * 14 - v * 21);

      // Fired terracotta, darkened with age.
      let r = 92 + blotch * 18 + grain * 14;
      let g = 40 + blotch * 8 + grain * 7;
      let b = 26 + blotch * 4 + grain * 5;
      let rough = 200 + grain * 40;
      let metal = 0;
      let height = 120 + grain * 60;

      if (v < BANDS.footEnd) {
        // Unglazed foot, a little lighter and dustier.
        r += 10; g += 6; b += 4; rough = 235;
      }
      // A painted row of dots below the rim: kumkum on clay.
      if (v > BANDS.paintStart && v < BANDS.paintEnd) {
        const cell = (u * 36) % 1;
        const dv = (v - (BANDS.paintStart + BANDS.paintEnd) / 2) / (BANDS.paintEnd - BANDS.paintStart);
        if (Math.hypot(cell - 0.5, dv * 0.9) < 0.3) {
          r = 128 + grain * 20; g = 26; b = 24; rough = 150; height = 175;
        }
      }
      // Burnished brass rim, worn unevenly.
      if (v > BANDS.rimStart && v < BANDS.rimEnd) {
        const wear = 0.75 + 0.25 * Math.sin(u * Math.PI * 10 + 1.3) * grain;
        r = 148 * wear; g = 98 * wear; b = 44 * wear;
        rough = 95 + grain * 50;
        metal = 230;
        height = 140 + grain * 30;
      }
      // Inside: soot and old ghee.
      if (v >= BANDS.rimEnd) {
        const soot = Math.min(1, (v - BANDS.rimEnd) * 4);
        r = r * (1 - soot * 0.6); g = g * (1 - soot * 0.6); b = b * (1 - soot * 0.55);
        rough = 120;
      }

      colorData.data.set([r, g, b, 255], i);
      surfaceData.data.set([0, rough, metal, 255], i);
      bumpData.data.set([height, height, height, 255], i);
    }
  }

  color.putImageData(colorData, 0, 0);
  surface.putImageData(surfaceData, 0, 0);
  bump.putImageData(bumpData, 0, 0);

  cached = {
    map: finish(colorCanvas, true),
    surface: finish(surfaceCanvas, false),
    bump: finish(bumpCanvas, false),
  };
  return cached;
}
