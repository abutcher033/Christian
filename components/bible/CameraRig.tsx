'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { ReadingDistance } from '@/lib/study/scenes';

type Props = {
  distance: ReadingDistance;
};

const POSE: Record<ReadingDistance, { y: number; z: number; lookY: number; lookZ: number; fit: number }> = {
  close: { y: 1.95, z: 0.48, lookY: 0.2, lookZ: -0.02, fit: 2.52 },
  cozy: { y: 2.28, z: 0.7, lookY: 0.24, lookZ: -0.14, fit: 2.78 },
  wide: { y: 3.2, z: 1.55, lookY: 0.2, lookZ: -0.78, fit: 4.4 },
};

/** Steady overhead reading view. The first frame snaps into place so the book does not drift in. */
export function CameraRig({ distance }: Props) {
  const { camera, size } = useThree();
  const focus = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());
  const base = useRef(new THREE.Vector3());
  const ready = useRef(false);

  useFrame(() => {
    const pose = POSE[distance];
    focus.current.set(0, pose.lookY, pose.lookZ);
    const perspective = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const tanHalf = Math.tan(((perspective.fov || 36) * Math.PI) / 360);
    base.current.set(0, pose.y, pose.z);
    const visibleWidth = 2 * base.current.length() * tanHalf * Math.max(aspect, 0.28);
    const scale = Math.max(1, pose.fit / visibleWidth);
    base.current.multiplyScalar(scale);
    desired.current.set(0, focus.current.y + base.current.y, focus.current.z + base.current.z);
    if (!ready.current) {
      camera.position.copy(desired.current);
      ready.current = true;
    } else {
      camera.position.lerp(desired.current, 0.14);
    }
    camera.lookAt(focus.current);
  });

  return null;
}
