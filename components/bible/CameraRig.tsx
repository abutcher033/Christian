'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { BOOK_TILT, SHEET_H, SHEET_W } from './metrics';

const LOOK = new THREE.Vector3(0, 0.26, 0.01);
/** A few degrees off straight down, so the sheet still reads as paper. */
const VIEW_TILT = 0.1;

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
    const spreadW = SHEET_W * 2 + 0.2;
    const spreadH = SHEET_H * Math.cos(BOOK_TILT) + 0.1;
    const fill = 0.94;
    const distance =
      Math.max(spreadH / (2 * tanHalf), spreadW / (2 * tanHalf * Math.max(aspect, 0.2))) / fill;
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
