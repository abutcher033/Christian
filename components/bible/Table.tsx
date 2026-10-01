'use client';

import { useWoodTexture } from './materials';

const LEGS: [number, number, number][] = [
  [-1.55, -0.46, -0.85],
  [1.55, -0.46, -0.85],
  [-1.55, -0.46, 0.85],
  [1.55, -0.46, 0.85],
];

export function Table() {
  const wood = useWoodTexture();

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.92, 0]} receiveShadow>
        <planeGeometry args={[18, 12]} />
        <meshStandardMaterial color="#120d0a" roughness={1} />
      </mesh>

      <mesh position={[0, -0.02, 0]} receiveShadow castShadow>
        <boxGeometry args={[3.7, 0.1, 2.15]} />
        <meshStandardMaterial map={wood} roughness={0.78} metalness={0.04} color="#c49262" />
      </mesh>

      <mesh position={[0, 0.035, 0]} receiveShadow>
        <boxGeometry args={[3.55, 0.012, 2.02]} />
        <meshStandardMaterial map={wood} roughness={0.62} metalness={0.05} color="#e0b07a" />
      </mesh>

      {LEGS.map((position) => (
        <mesh key={position.join(',')} position={position} castShadow>
          <boxGeometry args={[0.12, 0.86, 0.12]} />
          <meshStandardMaterial map={wood} roughness={0.8} color="#a87445" />
        </mesh>
      ))}
    </group>
  );
}
