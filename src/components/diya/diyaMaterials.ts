import { Color, MeshStandardMaterial } from 'three';
import { getDiyaTextures } from '../../utils/textures';

/** Shared by the hero diya and every instanced lamp: one compile, one upload. */
interface DiyaMaterials {
  body: MeshStandardMaterial;
  oil: MeshStandardMaterial;
  wick: MeshStandardMaterial;
}

let cached: DiyaMaterials | null = null;

export function getDiyaMaterials(): DiyaMaterials {
  if (cached) return cached;
  const { map, surface, bump } = getDiyaTextures();

  const body = new MeshStandardMaterial({
    map,
    roughnessMap: surface,
    metalnessMap: surface,
    roughness: 1,
    metalness: 1,
    bumpMap: bump,
    bumpScale: 0.35,
    envMapIntensity: 0.25,
  });

  // Ghee: dark, glossy, faintly warm. Picks up the flame as a sharp highlight.
  const oil = new MeshStandardMaterial({
    color: new Color('#2a1206'),
    roughness: 0.12,
    metalness: 0.0,
    emissive: new Color('#ff8a1f'),
    emissiveIntensity: 0,
  });

  // Cotton wick; its emissive is the ember that appears before the flame.
  const wick = new MeshStandardMaterial({
    color: new Color('#3a2a1c'),
    roughness: 0.95,
    emissive: new Color('#ff6a10'),
    emissiveIntensity: 0,
  });

  cached = { body, oil, wick };
  return cached;
}
