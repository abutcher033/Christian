'use client';

import { ContactShadows } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer, SMAA, Vignette } from '@react-three/postprocessing';
import { Suspense } from 'react';
import * as THREE from 'three';
import type { StudyEntry } from '@/data/studyContent';
import type { LaidPage } from '@/lib/bible/pages';
import { BibleBook, type PageTurn } from './BibleBook';
import { CameraRig } from './CameraRig';
import { Table } from './Table';

type Props = {
  pages: LaidPage[];
  spread: number;
  spreadCount: number;
  turn: PageTurn | null;
  onTurnEnd: () => void;
  onPrev: () => void;
  onNext: () => void;
  entries: StudyEntry[];
  onSelectEntry: (id: string) => void;
  reducedMotion: boolean;
  ignoreClick: () => boolean;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
};

export function BibleScene({
  pages,
  spread,
  spreadCount,
  turn,
  onTurnEnd,
  onPrev,
  onNext,
  entries,
  onSelectEntry,
  reducedMotion,
  ignoreClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: Props) {
  return (
    <div
      className="bible-stage"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [0, 1.22, 1.58], fov: 34, near: 0.1, far: 40 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.12,
        }}
        aria-label="3D Bible open on a wooden table"
      >
        <color attach="background" args={['#140e0b']} />
        <hemisphereLight args={['#f3e2cc', '#2a1812', 0.72]} />
        <ambientLight intensity={0.22} />
        <directionalLight
          castShadow
          position={[2.6, 6.4, 2.4]}
          intensity={2.4}
          color="#fff1dc"
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.4}
          shadow-camera-far={18}
          shadow-camera-left={-4}
          shadow-camera-right={4}
          shadow-camera-top={4}
          shadow-camera-bottom={-4}
          shadow-bias={-0.00035}
        />
        <directionalLight position={[-2.4, 2.2, 1.6]} intensity={0.45} color="#d7c4a4" />
        <spotLight
          position={[0.15, 3.4, 1.35]}
          angle={0.62}
          penumbra={0.75}
          intensity={18}
          distance={9}
          decay={2}
          color="#ffe0b8"
        />
        <Suspense fallback={null}>
          <CameraRig reducedMotion={reducedMotion} />
          <Table />
          <BibleBook
            pages={pages}
            spread={spread}
            spreadCount={spreadCount}
            turn={turn}
            onTurnEnd={onTurnEnd}
            onPrev={onPrev}
            onNext={onNext}
            entries={entries}
            onSelectEntry={onSelectEntry}
            ignoreClick={ignoreClick}
          />
          <ContactShadows
            position={[0, 0.04, 0]}
            opacity={0.42}
            scale={7}
            blur={2.4}
            far={1.6}
            resolution={512}
          />
          <EffectComposer multisampling={0} enableNormalPass={false}>
            <SMAA />
            <Bloom luminanceThreshold={0.94} mipmapBlur intensity={0.16} />
            <Vignette eskil={false} offset={0.16} darkness={0.58} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}
