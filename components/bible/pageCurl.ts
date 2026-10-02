import * as THREE from 'three';
import { SHEET_W } from './metrics';

/** Curl radius in world units. Large enough to read as paper from above the desk. */
export const CURL_RADIUS = 0.125;

/** Starts moving at once, then eases onto the stack. */
export function easePage(amount: number): number {
  const t = Math.min(1, Math.max(0, amount));
  return sampleBezier(t, 0.12, 0.78, 0.16, 1);
}

function sampleBezier(t: number, x1: number, y1: number, x2: number, y2: number): number {
  let u = t;
  for (let i = 0; i < 6; i += 1) {
    const x = bezier(u, x1, x2);
    const dx = bezierDeriv(u, x1, x2);
    if (Math.abs(dx) < 1e-4) break;
    u = Math.min(1, Math.max(0, u - (x - t) / dx));
  }
  return bezier(u, y1, y2);
}

function bezier(t: number, c1: number, c2: number): number {
  const mt = 1 - t;
  return 3 * mt * mt * t * c1 + 3 * mt * t * t * c2 + t * t * t;
}

function bezierDeriv(t: number, c1: number, c2: number): number {
  const mt = 1 - t;
  return 3 * mt * mt * c1 + 6 * mt * t * (c2 - c1) + 3 * t * t * (1 - c2);
}

/**
 * A sheet hinged at the spine.
 * `next` extends to the right. `prev` extends to the left, with UVs kept readable.
 */
export function createLeaf(
  width: number,
  height: number,
  face: 'front' | 'back',
  dir: 'next' | 'prev',
) {
  const geo = new THREE.PlaneGeometry(width, height, 72, 12);
  geo.rotateX(-Math.PI / 2);
  geo.translate(width / 2, 0, 0);
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  if (face === 'back') {
    geo.scale(1, -1, 1);
    for (let i = 0; i < uv.count; i += 1) uv.setX(i, 1 - uv.getX(i));
  }
  if (dir === 'prev') {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i += 1) pos.setX(i, -pos.getX(i));
    for (let i = 0; i < uv.count; i += 1) uv.setX(i, 1 - uv.getX(i));
  }
  geo.userData.base = Float32Array.from(geo.attributes.position.array);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Roll the sheet around a cylinder that travels from the outer edge to the spine.
 * Progress 0 is flat on the starting side. Progress 1 lies flat on the other side.
 * The page stays facing the reader instead of standing on edge.
 */
export function curlSheet(geo: THREE.BufferGeometry, progress: number) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const base = geo.userData.base as Float32Array;
  const width = SHEET_W;
  const radius = CURL_RADIUS;
  const arc = Math.PI * radius;
  const t = Math.min(1, Math.max(0, progress));
  const fold = width + (-arc / 2 - width) * t;
  const settle = 0.0035 * (1 - t);

  for (let i = 0; i < pos.count; i += 1) {
    const x0 = base[i * 3];
    const z0 = base[i * 3 + 2];
    const side = x0 < 0 ? -1 : 1;
    const x = Math.abs(x0);
    let along = x;
    let ny = 0;
    if (x > fold) {
      const dist = x - fold;
      if (dist <= arc) {
        const angle = dist / radius;
        along = fold + Math.sin(angle) * radius;
        ny = radius * (1 - Math.cos(angle));
      } else {
        along = fold - (dist - arc);
        ny = settle;
      }
    }
    const placed = along >= 0 ? side * along : -side * Math.abs(along);
    pos.setXYZ(i, placed, ny, z0);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
}
