'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ScenePreset } from '@/lib/study/scenes';
import { useWoodTexture } from './materials';

function useFlameTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not paint the fire.');
    const body = ctx.createLinearGradient(64, 256, 64, 0);
    body.addColorStop(0, 'rgba(90, 12, 0, 0)');
    body.addColorStop(0.18, 'rgba(210, 54, 12, 0.95)');
    body.addColorStop(0.42, 'rgba(255, 150, 40, 0.9)');
    body.addColorStop(0.68, 'rgba(255, 214, 140, 0.45)');
    body.addColorStop(1, 'rgba(255, 244, 220, 0)');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(64, 8);
    ctx.bezierCurveTo(118, 80, 120, 150, 78, 250);
    ctx.lineTo(50, 250);
    ctx.bezierCurveTo(8, 150, 14, 80, 64, 8);
    ctx.fill();
    const core = ctx.createLinearGradient(64, 240, 64, 40);
    core.addColorStop(0, 'rgba(255, 236, 180, 0.95)');
    core.addColorStop(1, 'rgba(255, 236, 180, 0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.moveTo(64, 36);
    ctx.bezierCurveTo(88, 90, 86, 150, 70, 230);
    ctx.lineTo(58, 230);
    ctx.bezierCurveTo(42, 150, 40, 90, 64, 36);
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function useRainTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not paint the rain.');
    ctx.clearRect(0, 0, 128, 256);
    ctx.strokeStyle = 'rgba(220, 230, 236, 0.55)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 70; i += 1) {
      const x = Math.random() * 128;
      const y = Math.random() * 256;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 2, y + 14 + Math.random() * 10);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  }, []);
}

function Flames({ amount }: { amount: number }) {
  const group = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const tex = useFlameTexture();
  const visible = amount > 0.04;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const flick =
      0.82 +
      Math.sin(t * 9.5) * 0.08 +
      Math.sin(t * 17.3) * 0.05 +
      Math.sin(t * 31) * 0.04 +
      (Math.sin(t * 3.1) > 0.92 ? 0.16 : 0);
    if (light.current) {
      light.current.intensity = amount * 11 * flick;
    }
    const flames = group.current;
    if (!flames) return;
    flames.children.forEach((child, index) => {
      const wobble = 0.92 + Math.sin(t * (8 + index) + index) * 0.1;
      const rise = 0.86 + Math.sin(t * (11 + index * 1.7) + index * 2) * 0.16;
      child.scale.set(wobble, rise, 1);
      child.position.x = Math.sin(t * 6 + index * 1.4) * 0.012;
    });
  });

  return (
    <group position={[-1.9, 0.42, -1.25]}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[0.86, 0.1, 0.28]} />
        <meshStandardMaterial color="#3a2418" roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[0.72, 0.62, 0.16]} />
        <meshStandardMaterial color="#4e2c24" roughness={0.86} />
      </mesh>
      <mesh position={[0, -0.02, 0.09]}>
        <boxGeometry args={[0.46, 0.4, 0.06]} />
        <meshStandardMaterial color="#1a0c08" roughness={1} />
      </mesh>
      <mesh position={[0, -0.2, 0.12]}>
        <boxGeometry args={[0.4, 0.06, 0.1]} />
        <meshStandardMaterial
          color={visible ? '#ff7a3c' : '#3a241c'}
          emissive={visible ? '#ff5a1f' : '#000000'}
          emissiveIntensity={visible ? 0.8 : 0}
          roughness={0.5}
        />
      </mesh>
      {visible && (
        <group ref={group} position={[0, 0.02, 0.14]}>
          {[0, 1, 2, 3, 4].map((index) => (
            <mesh key={index} position={[(index - 2) * 0.055, 0.08, index % 2 === 0 ? 0 : -0.02]}>
              <planeGeometry args={[0.16, 0.36]} />
              <meshBasicMaterial
                map={tex}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
                opacity={0.55 + amount * 0.4}
              />
            </mesh>
          ))}
        </group>
      )}
      <pointLight
        ref={light}
        position={[0.15, 0.25, 0.45]}
        color="#ff9a4a"
        distance={5.5}
        decay={2}
        intensity={0}
        castShadow={false}
      />
    </group>
  );
}

function Window({ scene }: { scene: ScenePreset }) {
  const rain = useRainTexture();
  const rainMat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((_, delta) => {
    if (!rainMat.current || scene.rain <= 0) return;
    rain.offset.y -= delta * 0.45;
  });

  return (
    <group position={[1.15, 0.95, -2.48]}>
      <mesh>
        <boxGeometry args={[1.35, 1.15, 0.06]} />
        <meshStandardMaterial color={scene.trim} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.04]}>
        <planeGeometry args={[1.12, 0.92]} />
        <meshStandardMaterial
          color={scene.sky}
          emissive={scene.sky}
          emissiveIntensity={scene.id === 'morning' ? 0.55 : 0.2}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[0.03, 0.92, 0.02]} />
        <meshStandardMaterial color="#d9c7a4" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[1.12, 0.03, 0.02]} />
        <meshStandardMaterial color="#d9c7a4" roughness={0.45} />
      </mesh>
      {scene.rain > 0 && (
        <mesh position={[0, 0, 0.07]}>
          <planeGeometry args={[1.1, 0.9]} />
          <meshBasicMaterial ref={rainMat} map={rain} transparent opacity={0.45} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function DeskLamp({ amount }: { amount: number }) {
  const wood = useWoodTexture();
  return (
    <group position={[1.48, 0.02, -0.72]}>
      <mesh position={[0, 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.11, 0.04, 16]} />
        <meshStandardMaterial color="#5c4030" roughness={0.55} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.32, 8]} />
        <meshStandardMaterial color="#c4a35a" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.38, 0]} castShadow>
        <coneGeometry args={[0.13, 0.12, 16, 1, true]} />
        <meshStandardMaterial
          map={wood}
          color="#f0ddb0"
          emissive="#ffd7a1"
          emissiveIntensity={amount > 0.2 ? 0.35 : 0.05}
          roughness={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      <pointLight
        position={[0, 0.28, 0.12]}
        color="#ffd8a8"
        intensity={amount * 2.4}
        distance={2.4}
        decay={2}
      />
    </group>
  );
}

function Shelf() {
  return (
    <group position={[-0.15, 0.85, -2.46]}>
      <mesh>
        <boxGeometry args={[1.15, 1.35, 0.16]} />
        <meshStandardMaterial color="#3a2618" roughness={0.72} />
      </mesh>
      {[0.42, 0.1, -0.22, -0.5].map((y) => (
        <mesh key={y} position={[0, y, 0.09]}>
          <boxGeometry args={[1.05, 0.03, 0.12]} />
          <meshStandardMaterial color="#5a3d28" roughness={0.6} />
        </mesh>
      ))}
      {[
        [-0.38, 0.24, '#6e2f2a'],
        [-0.22, 0.28, '#2f4a3c'],
        [-0.05, 0.22, '#8a6230'],
        [0.12, 0.3, '#243044'],
        [0.3, 0.2, '#5c3d2e'],
        [-0.32, -0.08, '#3d2a4a'],
        [-0.12, -0.04, '#6a4328'],
        [0.08, -0.1, '#2c3a32'],
        [0.28, -0.06, '#7a3b2e'],
      ].map(([x, y, color]) => (
        <mesh key={`${x}-${y}`} position={[x as number, y as number, 0.12]} castShadow>
          <boxGeometry args={[0.12, 0.22 + ((x as number) % 0.08), 0.08]} />
          <meshStandardMaterial color={color as string} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

export function StudyRoom({ scene }: { scene: ScenePreset }) {
  const wood = useWoodTexture();

  return (
    <group>
      <color attach="background" args={[scene.background]} />
      <hemisphereLight args={[scene.hemisphereSky, scene.hemisphereGround, scene.hemisphere]} />
      <ambientLight intensity={scene.id === 'morning' ? 0.28 : 0.12} />
      <directionalLight
        castShadow
        position={[2.2, 6.2, 2.2]}
        intensity={scene.id === 'morning' ? 2.1 : 1.55}
        color={scene.id === 'morning' ? '#fff6e8' : '#ffe7c4'}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.4}
        shadow-camera-far={16}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.00035}
      />
      <directionalLight
        position={[2.8, 2.4, -1.6]}
        intensity={scene.windowLight}
        color={scene.windowColor}
      />
      <spotLight
        position={[0.05, 3.15, 1.15]}
        angle={0.55}
        penumbra={0.8}
        intensity={scene.id === 'night' ? 22 : 16}
        distance={8}
        decay={2}
        color="#fff0dc"
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.91, -0.4]} receiveShadow>
        <planeGeometry args={[14, 10]} />
        <meshStandardMaterial map={wood} color={scene.floor} roughness={0.86} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.888, 0.05]} receiveShadow>
        <planeGeometry args={[2.6, 1.7]} />
        <meshStandardMaterial color="#6a3030" roughness={0.92} />
      </mesh>

      <mesh position={[0, 0.7, -2.7]} receiveShadow>
        <boxGeometry args={[8.4, 3.4, 0.16]} />
        <meshStandardMaterial color={scene.wall} roughness={0.9} />
      </mesh>
      <mesh position={[-3.5, 0.7, -0.8]} receiveShadow>
        <boxGeometry args={[0.16, 3.4, 4.2]} />
        <meshStandardMaterial color={scene.wall} roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.15, -1.2]}>
        <boxGeometry args={[8.4, 0.12, 4]} />
        <meshStandardMaterial color={scene.trim} roughness={1} />
      </mesh>

      <group position={[0.55, 1.55, -2.58]}>
        <mesh>
          <boxGeometry args={[0.34, 0.06, 0.04]} />
          <meshStandardMaterial color="#5c4030" roughness={0.55} />
        </mesh>
        <mesh position={[0, -0.16, 0]}>
          <boxGeometry args={[0.06, 0.28, 0.04]} />
          <meshStandardMaterial color="#5c4030" roughness={0.55} />
        </mesh>
      </group>

      <Shelf />
      <Window scene={scene} />
      <Flames amount={scene.fire} />
      <DeskLamp amount={scene.lamp} />

      <mesh position={[-1.52, 0.08, -0.72]} castShadow>
        <boxGeometry args={[0.28, 0.05, 0.2]} />
        <meshStandardMaterial color="#6e2f2a" roughness={0.55} />
      </mesh>
      <mesh position={[-1.52, 0.14, -0.72]} castShadow>
        <boxGeometry args={[0.26, 0.045, 0.18]} />
        <meshStandardMaterial color="#243044" roughness={0.55} />
      </mesh>
      <mesh position={[-1.52, 0.19, -0.72]} castShadow>
        <boxGeometry args={[0.24, 0.04, 0.17]} />
        <meshStandardMaterial color="#2f4a3c" roughness={0.55} />
      </mesh>
    </group>
  );
}
