import * as THREE from 'three';
import { SHEET_W } from './metrics';

/** Starts moving at once, then eases onto the stack. */
export function easePage(amount: number): number {
  const t = Math.min(1, Math.max(0, amount));
  return sampleBezier(t, 0.16, 0.72, 0.2, 1);
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

/** A flat sheet. x = 0 is the spine, x = width is the outer edge. */
export function createLeaf(width: number, height: number) {
  const geo = new THREE.PlaneGeometry(width, height, 72, 10);
  geo.rotateX(-Math.PI / 2);
  geo.translate(width / 2, 0, 0);
  geo.userData.base = Float32Array.from(geo.attributes.position.array);
  return geo;
}

/**
 * Bend the sheet around the spine.
 * The outer edge leads, so the page curves instead of flipping edge-on all at once.
 * At the end every point has swung from x = s to x = -s and lies flat.
 * `dir` mirrors that swing for a backward turn.
 */
export function curlSheet(geo: THREE.BufferGeometry, progress: number, dir: 'next' | 'prev') {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const normal = geo.attributes.normal as THREE.BufferAttribute;
  const base = geo.userData.base as Float32Array;
  const width = SHEET_W;
  const t = Math.min(1, Math.max(0, progress));
  const sign = dir === 'next' ? 1 : -1;
  const edge = Math.PI * t;
  const bend = Math.sin(Math.PI * t);

  for (let i = 0; i < pos.count; i += 1) {
    const s = base[i * 3];
    const z = base[i * 3 + 2];
    const across = s / width;
    const shaped = Math.pow(across, 0.58);
    const angle = edge * (1 - bend * (1 - shaped));
    const lift = Math.sin(angle);
    const nx = Math.cos(angle) * s * sign;
    const ny = lift * s + Math.sin(across * Math.PI) * bend * 0.035;
    pos.setXYZ(i, nx, ny + 0.004, z);
    normal.setXYZ(i, -Math.sin(angle) * sign, Math.cos(angle), 0);
  }
  pos.needsUpdate = true;
  normal.needsUpdate = true;
  geo.computeBoundingSphere();
}

export function createPageMaterial(front: THREE.Texture, back: THREE.Texture, dir: 'next' | 'prev') {
  const material = new THREE.MeshStandardMaterial({
    map: front,
    roughness: 0.82,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  material.polygonOffset = true;
  material.polygonOffsetFactor = -1;
  material.polygonOffsetUnits = -1;
  material.customProgramCacheKey = () => `bible-page-${dir}`;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.backMap = { value: back };
    shader.uniforms.uPrev = { value: dir === 'prev' ? 1 : 0 };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <map_pars_fragment>',
        '#include <map_pars_fragment>\nuniform sampler2D backMap;\nuniform float uPrev;\n',
      )
      .replace(
        '#include <map_fragment>',
        `
#ifdef USE_MAP
  vec2 pageUv = vMapUv;
  if (uPrev > 0.5) pageUv.x = 1.0 - pageUv.x;
  vec2 backUv = uPrev > 0.5 ? vMapUv : vec2(1.0 - vMapUv.x, vMapUv.y);
  float showBack = (uPrev > 0.5) ? (gl_FrontFacing ? 1.0 : 0.0) : (gl_FrontFacing ? 0.0 : 1.0);
  vec4 sampledDiffuseColor = mix(texture2D(map, pageUv), texture2D(backMap, backUv), showBack);
  diffuseColor *= sampledDiffuseColor;
#endif
`,
      );
  };
  return material;
}
