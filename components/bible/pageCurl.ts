import * as THREE from 'three';
import { SHEET_W } from './metrics';

/** The page moves at once, then settles like a sheet landing. */
export function easePage(amount: number): number {
  const t = Math.min(1, Math.max(0, amount));
  return 1 - Math.pow(1 - t, 2.15);
}

function smooth(amount: number): number {
  const u = Math.min(1, Math.max(0, amount));
  return u * u * (3 - 2 * u);
}

/** A flat sheet. x = 0 is the spine, x = width is the outer edge. */
export function createLeaf(width: number, height: number) {
  const geo = new THREE.PlaneGeometry(width, height, 80, 3);
  geo.rotateX(-Math.PI / 2);
  geo.translate(width / 2, 0, 0);
  geo.userData.base = Float32Array.from(geo.attributes.position.array);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.15, 0), width + height);
  return geo;
}

/**
 * Roll the sheet from the outer edge toward the spine.
 * A narrow curl travels across the page; the paper that has passed the curl
 * lies flat again, so the turn reads as a page and not a flipping card.
 */
export function curlSheet(geo: THREE.BufferGeometry, progress: number, dir: 'next' | 'prev') {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const base = geo.userData.base as Float32Array;
  const width = SHEET_W;
  const t = Math.min(1, Math.max(0, progress));
  const sign = dir === 'next' ? 1 : -1;

  for (let i = 0; i < pos.count; i += 1) {
    const s = base[i * 3];
    const z = base[i * 3 + 2];
    let x = s;
    let y = 0.004;

    if (t > 0.001 && t < 0.999) {
      const radius = 0.11 * Math.sin(Math.PI * t);
      const fold = width * (1 - t);
      if (s > fold) {
        const arc = s - fold;
        const half = Math.PI * Math.max(radius, 1e-4);
        if (arc <= half) {
          const angle = arc / Math.max(radius, 1e-4);
          x = fold - radius * Math.sin(angle);
          y = radius * (1 - Math.cos(angle)) + 0.004;
        } else {
          const extra = arc - half;
          const settled = smooth(Math.min(1, extra / 0.16));
          y = 2 * radius * (1 - settled) + 0.005 * settled;
          x = fold - extra;
        }
        const land = smooth(Math.min(1, Math.max(0, (t - 0.84) / 0.16)));
        const done = Math.min(1, arc / (half + 0.35));
        const weight = land * done;
        x += (-s - x) * weight;
        y += (0.004 - y) * weight;
      }
    } else if (t >= 0.999) {
      x = -s;
    }

    pos.setXYZ(i, x * sign, y, z);
  }
  pos.needsUpdate = true;
}

export function createPageMaterial(front: THREE.Texture, back: THREE.Texture, dir: 'next' | 'prev') {
  const material = new THREE.MeshBasicMaterial({
    map: front,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  material.polygonOffset = true;
  material.polygonOffsetFactor = -2;
  material.polygonOffsetUnits = -2;
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
