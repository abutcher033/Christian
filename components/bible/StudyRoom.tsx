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

function Hearth({ amount }: { amount: number }) {
  const flames = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const tex = useFlameTexture();
  const lit = amount > 0.04;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const flick =
      0.76 +
      Math.sin(t * 9.2) * 0.1 +
      Math.sin(t * 16.4) * 0.06 +
      Math.sin(t * 29) * 0.05 +
      (Math.sin(t * 3.4) > 0.93 ? 0.18 : 0);
    if (light.current) light.current.intensity = amount * 18 * flick;
    const group = flames.current;
    if (!group) return;
    group.children.forEach((child, index) => {
      const wobble = 0.88 + Math.sin(t * (7.2 + index) + index) * 0.14;
      const rise = 0.84 + Math.sin(t * (11 + index * 1.5) + index) * 0.2;
      child.scale.set(wobble, rise, 1);
      child.position.x = (index - 2) * 0.13 + Math.sin(t * 5 + index) * 0.015;
    });
  });

  return (
    <group position={[-2.05, -0.91, -2.05]}>
      <mesh position={[0, 0.07, 0.34]} receiveShadow>
        <boxGeometry args={[1.7, 0.14, 0.78]} />
        <meshStandardMaterial color="#6d5c50" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.78, -0.02]} castShadow>
        <boxGeometry args={[1.5, 1.4, 0.34]} />
        <meshStandardMaterial color="#5a4336" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.55, -0.06]} castShadow>
        <boxGeometry args={[0.95, 0.7, 0.22]} />
        <meshStandardMaterial color="#4a382e" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.52, 0.16]} castShadow>
        <boxGeometry args={[1.82, 0.1, 0.46]} />
        <meshStandardMaterial color="#3b291c" roughness={0.62} />
      </mesh>
      <mesh position={[0, 0.52, 0.12]}>
        <boxGeometry args={[0.98, 0.78, 0.22]} />
        <meshStandardMaterial color="#120c09" roughness={1} />
      </mesh>
      <mesh position={[0, 0.48, 0.02]}>
        <planeGeometry args={[0.82, 0.62]} />
        <meshStandardMaterial
          color={lit ? '#ff6a2c' : '#1a100c'}
          emissive={lit ? '#ff4d18' : '#000000'}
          emissiveIntensity={lit ? 0.4 : 0}
          roughness={1}
        />
      </mesh>
      {[
        [-0.16, 0.24, 0.22, 0.35],
        [0.1, 0.3, 0.24, -0.25],
        [-0.02, 0.2, 0.26, 0.1],
      ].map(([x, y, z, spin]) => (
        <mesh key={`${x}-${y}`} position={[x, y, z]} rotation={[spin, 0.4, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.045, 0.055, 0.42, 8]} />
          <meshStandardMaterial color="#3a2416" roughness={0.86} />
        </mesh>
      ))}
      <mesh position={[0, 0.16, 0.24]}>
        <boxGeometry args={[0.62, 0.05, 0.26]} />
        <meshStandardMaterial
          color={lit ? '#ff7a32' : '#2a1812'}
          emissive={lit ? '#ff5a1a' : '#000000'}
          emissiveIntensity={lit ? 0.7 : 0}
          roughness={0.6}
        />
      </mesh>
      {[-0.38, 0.38].map((x) => (
        <mesh key={x} position={[x, 0.28, 0.32]} castShadow>
          <boxGeometry args={[0.04, 0.22, 0.16]} />
          <meshStandardMaterial color="#2a211c" metalness={0.35} roughness={0.45} />
        </mesh>
      ))}
      {lit && (
        <group ref={flames} position={[0, 0.42, 0.36]}>
          {[0, 1, 2, 3, 4].map((index) => (
            <mesh key={index} position={[(index - 2) * 0.13, 0.28, 0]} rotation={[-0.95, (index - 2) * 0.12, 0]}>
              <planeGeometry args={[index === 2 ? 0.34 : 0.26, index === 2 ? 0.78 : 0.62]} />
              <meshBasicMaterial
                map={tex}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
                opacity={0.72 + amount * 0.2}
              />
            </mesh>
          ))}
        </group>
      )}
      <pointLight
        ref={light}
        position={[0.35, 0.7, 1.15]}
        color="#ff9344"
        distance={8}
        decay={2}
        intensity={0}
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
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.06, 0.16, 20, 1, true]} />
        <meshStandardMaterial
          map={wood}
          color="#f4ead6"
          emissive="#ffd7a1"
          emissiveIntensity={amount > 0.2 ? 0.05 : 0}
          roughness={0.72}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <sphereGeometry args={[0.028, 12, 12]} />
        <meshStandardMaterial
          color="#fff2dc"
          emissive="#ffc98a"
          emissiveIntensity={amount > 0.2 ? 0.22 : 0}
          roughness={0.4}
        />
      </mesh>
      <pointLight
        position={[0, 0.3, 0.14]}
        color="#ffd8a8"
        intensity={amount * 1.6}
        distance={2.2}
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
      <Hearth amount={scene.fire} />
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
