'use client';

import { ContactShadows } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer, SMAA, Vignette } from '@react-three/postprocessing';
import { Suspense, type MutableRefObject, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import * as THREE from 'three';
import type { LaidPage } from '@/lib/bible/pages';
import type { ReadingDistance, StudySceneId } from '@/lib/study/scenes';
import { sceneById } from '@/lib/study/scenes';
import { BibleBook, type BibleBookHandle } from './BibleBook';
import { CameraRig } from './CameraRig';
import { StudyRoom } from './StudyRoom';
import { Table } from './Table';

type Props = {
  pages: LaidPage[];
  spread: number;
  spreadCount: number;
  bookRef: RefObject<BibleBookHandle>;
  onCommit: (dir: 'next' | 'prev') => void;
  reducedMotion: boolean;
  blocked: boolean;
  gestureRef: MutableRefObject<boolean>;
  onTurning: (active: boolean) => void;
  scene: StudySceneId;
  readingDistance: ReadingDistance;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
};

export function BibleScene({
  pages,
  spread,
  spreadCount,
  bookRef,
  onCommit,
  reducedMotion,
  blocked,
  gestureRef,
  onTurning,
  scene,
  readingDistance,
  onPointerDown,
  onPointerUp,
}: Props) {
  const preset = sceneById(scene);

  return (
    <div
      className="bible-stage"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 2.2, 0.5], fov: 34, near: 0.1, far: 40 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.08,
        }}
        aria-label="An open Bible on a desk in a study"
      >
        <Suspense fallback={null}>
          <CameraRig distance={readingDistance} />
          <StudyRoom scene={preset} />
          <Table />
          <BibleBook
            ref={bookRef}
            pages={pages}
            spread={spread}
            spreadCount={spreadCount}
            onCommit={onCommit}
            reducedMotion={reducedMotion}
            blocked={blocked}
            gestureRef={gestureRef}
            onTurning={onTurning}
          />
          <ContactShadows
            position={[0, 0.04, 0]}
            opacity={0.38}
            scale={8}
            blur={2.6}
            far={1.8}
            resolution={512}
          />
          <EffectComposer multisampling={0} enableNormalPass={false}>
            <SMAA />
            <Bloom luminanceThreshold={0.86} mipmapBlur intensity={0.28} />
            <Vignette eskil={false} offset={0.22} darkness={0.42} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}
