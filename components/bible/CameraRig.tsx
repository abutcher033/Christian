'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

type Props = {
  reducedMotion: boolean;
};

/** Seated view over the open Bible, with a very slight lean toward the pointer. */
export function CameraRig({ reducedMotion }: Props) {
  const { camera, pointer } = useThree();
  const focus = useRef(new THREE.Vector3(0, 0.12, 0));
  const desired = useRef(new THREE.Vector3());

  useFrame(() => {
    const leanX = reducedMotion ? 0 : pointer.x * 0.07;
    const leanY = reducedMotion ? 0 : pointer.y * 0.035;
    desired.current.set(leanX, 1.22 + leanY, 1.58);
    camera.position.lerp(desired.current, 0.06);
    camera.lookAt(focus.current);
  });

  return null;
}
