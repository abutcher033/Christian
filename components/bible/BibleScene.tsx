'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense, type MutableRefObject, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import * as THREE from 'three';
import type { LaidPage } from '@/lib/bible/pages';
import type { StudySceneId } from '@/lib/study/scenes';
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
        dpr={[1, 2]}
        camera={{ position: [0, 2.4, 0.35], fov: 22, near: 0.05, far: 40 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.NoToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        aria-label="An open Bible on a desk in a study"
      >
        <Suspense fallback={null}>
          <CameraRig />
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
        </Suspense>
      </Canvas>
    </div>
  );
}
