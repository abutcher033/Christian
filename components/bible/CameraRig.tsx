'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

type Props = {
  reducedMotion: boolean;
};

/** Overhead reading view: steeply down on the open pages, with a slight pointer lean. */
export function CameraRig({ reducedMotion }: Props) {
  const { camera, pointer, size } = useThree();
  const focus = useRef(new THREE.Vector3(0, 0.3, 0.02));
  const desired = useRef(new THREE.Vector3());
  const base = useRef(new THREE.Vector3());

  useFrame(() => {
    const leanX = reducedMotion ? 0 : pointer.x * 0.03;
    const leanY = reducedMotion ? 0 : pointer.y * 0.01;
    const perspective = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const tanHalf = Math.tan(((perspective.fov || 36) * Math.PI) / 360);
    // Base pose is the desktop reading angle. Pull back only when a narrow
    // window would clip the outer edges of the open spread.
    base.current.set(0, 2.9, 0.46);
    const visibleWidth = 2 * base.current.length() * tanHalf * Math.max(aspect, 0.3);
    const scale = Math.max(1, 2.72 / visibleWidth);
    base.current.multiplyScalar(scale);
    desired.current.set(
      leanX,
      focus.current.y + base.current.y + leanY,
      focus.current.z + base.current.z,
    );
    camera.position.lerp(desired.current, 0.06);
    camera.lookAt(focus.current);
  });

  return null;
}
