import * as THREE from 'three';
import { drawPage, PAGE_H, PAGE_SCALE, PAGE_W, type LaidPage } from '@/lib/bible/pages';

const cache = new Map<number, { tex: THREE.CanvasTexture; used: number }>();
let clock = 0;
let blank: THREE.CanvasTexture | null = null;
const MAX_CACHED = 8;

function bake(page: LaidPage | null): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(PAGE_W * PAGE_SCALE);
  canvas.height = Math.round(PAGE_H * PAGE_SCALE);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Could not draw a Bible page.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.setTransform(PAGE_SCALE, 0, 0, PAGE_SCALE, 0, 0);
  drawPage(ctx, page);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  // Mipmaps soften type. The page is read large, so sample the full texture.
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 16;
  tex.needsUpdate = true;
  return tex;
}

export function textureFor(page: LaidPage | null): THREE.CanvasTexture {
  if (!page) {
    if (!blank) blank = bake(null);
    return blank;
  }
  clock += 1;
  const hit = cache.get(page.index);
  if (hit) {
    hit.used = clock;
    return hit.tex;
  }
  const tex = bake(page);
  cache.set(page.index, { tex, used: clock });
  return tex;
}

/** Drop textures that are not on screen so a long reading session stays light. */
export function pruneTextures(keep: number[]) {
  const pinned = new Set(keep);
  if (cache.size <= MAX_CACHED) return;
  const stale = [...cache.entries()]
    .filter(([key]) => !pinned.has(key))
    .sort((a, b) => a[1].used - b[1].used);
  while (cache.size > MAX_CACHED && stale.length > 0) {
    const next = stale.shift();
    if (!next) break;
    next[1].tex.dispose();
    cache.delete(next[0]);
  }
}
