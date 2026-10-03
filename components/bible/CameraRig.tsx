'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { BOOK_TILT, SHEET_H, SHEET_W } from './metrics';

const LOOK = new THREE.Vector3(0, 0.26, 0.01);
/** Low enough to see a page lift, steep enough that the lines stay even. */
const VIEW_TILT = 0.3;

/**
 * Frames the open book so the type fills the stage.
 * Medium reading is the only view: both pages, as large as they can be
 * without clipping the cover.
 */
export function CameraRig() {
  const { camera, size } = useThree();
  const desired = useRef(new THREE.Vector3());
  const ready = useRef(false);

  useFrame(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    if (perspective.fov !== 22) {
      perspective.fov = 22;
      perspective.updateProjectionMatrix();
    }
    const aspect = size.width / Math.max(1, size.height);
    const tanHalf = Math.tan((perspective.fov * Math.PI) / 360);
    const spreadW = SHEET_W * 2 + 0.06;
    const spreadH = SHEET_H * Math.cos(BOOK_TILT) + 0.02;
    const fit =
      Math.max(spreadH / (2 * tanHalf), spreadW / (2 * tanHalf * Math.max(aspect, 0.2)));
    // Close enough that the type is large, far enough that the last line stays on the page.
    const distance = fit * 0.9;
    desired.current.set(0, LOOK.y + Math.cos(VIEW_TILT) * distance, LOOK.z + Math.sin(VIEW_TILT) * distance);
    if (!ready.current) {
      camera.position.copy(desired.current);
      ready.current = true;
    } else {
      camera.position.lerp(desired.current, 0.2);
    }
    camera.lookAt(LOOK);
  });

  return null;
}
