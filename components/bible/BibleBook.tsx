'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { StudyEntry } from '@/data/studyContent';
import type { LaidPage } from '@/lib/bible/pages';
import { StudyEntryMarker } from '@/components/study/StudyEntryMarker';
import { useLeatherTexture, usePageEdgeTexture } from './materials';
import { BOOK_TILT, SHEET_H, SHEET_W } from './metrics';
import { pruneTextures, textureFor } from './pageTextures';

export type PageTurn = {
  dir: 'next' | 'prev';
  token: number;
  from: number;
};

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
  ignoreClick: () => boolean;
};

function createLeaf(width: number, height: number, face: 'front' | 'back') {
  const geo = new THREE.PlaneGeometry(width, height, 32, 8);
  geo.rotateX(-Math.PI / 2);
  geo.translate(width / 2, 0, 0);
  if (face === 'back') {
    geo.scale(1, -1, 1);
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i += 1) uv.setX(i, 1 - uv.getX(i));
    geo.translate(0, -0.004, 0);
  }
  geo.userData.base = Float32Array.from(geo.attributes.position.array);
  geo.computeVertexNormals();
  return geo;
}

function deformLeaf(geo: THREE.BufferGeometry, angle: number, width: number) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const base = geo.userData.base as Float32Array;
  const curl = Math.sin(angle);
  for (let i = 0; i < pos.count; i += 1) {
    const x = base[i * 3];
    const y = base[i * 3 + 1];
    const z = base[i * 3 + 2];
    const along = Math.min(1, Math.max(0, x / width));
    const lift = curl * Math.sin(along * Math.PI) * 0.07;
    const y0 = y + lift;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    pos.setXYZ(i, c * x - s * y0, s * x + c * y0, z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
}

function Sheet({
  side,
  page,
  y,
  onClick,
  ignoreClick,
}: {
  side: 'left' | 'right';
  page: LaidPage | null;
  y: number;
  onClick?: () => void;
  ignoreClick: () => boolean;
}) {
  const tex = useMemo(() => textureFor(page), [page]);
  const x = side === 'right' ? SHEET_W / 2 : -SHEET_W / 2;

  return (
    <mesh
      position={[x, y, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      castShadow
      receiveShadow
      onClick={(event) => {
        event.stopPropagation();
        if (ignoreClick()) return;
        onClick?.();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <planeGeometry args={[SHEET_W, SHEET_H]} />
      <meshStandardMaterial map={tex} roughness={0.92} metalness={0} />
    </mesh>
  );
}

function TurningSheet({
  front,
  back,
  dir,
  y,
  onDone,
}: {
  front: LaidPage | null;
  back: LaidPage | null;
  dir: 'next' | 'prev';
  y: number;
  onDone: () => void;
}) {
  const frontGeo = useMemo(() => createLeaf(SHEET_W, SHEET_H, 'front'), []);
  const backGeo = useMemo(() => createLeaf(SHEET_W, SHEET_H, 'back'), []);
  const frontTex = useMemo(() => textureFor(front), [front]);
  const backTex = useMemo(() => textureFor(back), [back]);
  const finished = useRef(false);
  const started = useRef<number | null>(null);

  useEffect(() => {
    const angle = dir === 'next' ? 0 : Math.PI;
    deformLeaf(frontGeo, angle, SHEET_W);
    deformLeaf(backGeo, angle, SHEET_W);
    return () => {
      frontGeo.dispose();
      backGeo.dispose();
    };
  }, [dir, frontGeo, backGeo]);

  useFrame((state) => {
    if (started.current == null) started.current = state.clock.elapsedTime;
    const t = Math.min(1, (state.clock.elapsedTime - started.current) / 0.84);
    const eased = t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
    const angle = dir === 'next' ? eased * Math.PI : Math.PI * (1 - eased);
    deformLeaf(frontGeo, angle, SHEET_W);
    deformLeaf(backGeo, angle, SHEET_W);
    if (t >= 1 && !finished.current) {
      finished.current = true;
      onDone();
    }
  });

  return (
    <group position={[0, y, 0]}>
      <mesh geometry={frontGeo} castShadow>
        <meshStandardMaterial map={frontTex} roughness={0.9} metalness={0} side={THREE.FrontSide} />
      </mesh>
      <mesh geometry={backGeo} castShadow>
        <meshStandardMaterial map={backTex} roughness={0.9} metalness={0} side={THREE.FrontSide} />
      </mesh>
    </group>
  );
}

export function BibleBook({
  pages,
  spread,
  spreadCount,
  turn,
  onTurnEnd,
  onPrev,
  onNext,
  entries,
  onSelectEntry,
  ignoreClick,
}: Props) {
  const leather = useLeatherTexture();
  const edge = usePageEdgeTexture();
  const progress = spread / Math.max(1, spreadCount - 1);
  const leftThickness = 0.028 + progress * 0.06;
  const rightThickness = 0.028 + (1 - progress) * 0.06;
  const base = 0.055;
  const leftTop = base + leftThickness;
  const rightTop = base + rightThickness;
  const sheetY = Math.max(leftTop, rightTop) + 0.006;

  const left = pages[spread * 2] ?? null;
  const right = pages[spread * 2 + 1] ?? null;
  const staticLeft = turn?.dir === 'prev' ? (pages[spread * 2 - 2] ?? null) : left;
  const staticRight = turn?.dir === 'next' ? (pages[spread * 2 + 3] ?? null) : right;
  const turnFront = turn?.dir === 'next' ? right : (pages[spread * 2 - 1] ?? null);
  const turnBack = turn?.dir === 'next' ? (pages[spread * 2 + 2] ?? null) : left;

  const prefetchKey = [
    spread * 2 - 2,
    spread * 2 - 1,
    spread * 2,
    spread * 2 + 1,
    spread * 2 + 2,
    spread * 2 + 3,
  ]
    .filter((index) => index >= 0 && index < pages.length)
    .join(',');

  useEffect(() => {
    const indexes = prefetchKey.split(',').filter(Boolean).map(Number);
    indexes.forEach((index) => {
      const page = pages[index];
      if (page) textureFor(page);
    });
    pruneTextures(indexes);
  }, [prefetchKey, pages]);

  return (
    <group position={[0, 0.16, 0]} rotation={[BOOK_TILT, 0, 0]}>
      <mesh position={[-SHEET_W / 2 - 0.01, 0.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[SHEET_W + 0.1, 0.03, SHEET_H + 0.09]} />
        <meshStandardMaterial map={leather} roughness={0.62} metalness={0.06} />
      </mesh>
      <mesh position={[SHEET_W / 2 + 0.01, 0.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[SHEET_W + 0.1, 0.03, SHEET_H + 0.09]} />
        <meshStandardMaterial map={leather} roughness={0.62} metalness={0.06} />
      </mesh>

      <mesh position={[0, 0.05, 0]} castShadow>
        <boxGeometry args={[0.055, 0.07, SHEET_H + 0.04]} />
        <meshStandardMaterial color="#2a1610" roughness={0.45} metalness={0.12} />
      </mesh>
      {[-0.28, 0, 0.28].map((z) => (
        <mesh key={z} position={[0, 0.086, z]}>
          <boxGeometry args={[0.058, 0.008, 0.012]} />
          <meshStandardMaterial color="#c4a35a" metalness={0.65} roughness={0.28} />
        </mesh>
      ))}

      <mesh position={[-SHEET_W / 2, base + leftThickness / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[SHEET_W - 0.02, leftThickness, SHEET_H - 0.03]} />
        <meshStandardMaterial map={edge} roughness={0.85} color="#f3eadc" />
      </mesh>
      <mesh position={[SHEET_W / 2, base + rightThickness / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[SHEET_W - 0.02, rightThickness, SHEET_H - 0.03]} />
        <meshStandardMaterial map={edge} roughness={0.85} color="#f3eadc" />
      </mesh>

      <mesh position={[-SHEET_W - 0.012, base + leftThickness / 2, 0]}>
        <boxGeometry args={[0.012, leftThickness, SHEET_H - 0.04]} />
        <meshStandardMaterial color="#c4a35a" metalness={0.55} roughness={0.32} />
      </mesh>
      <mesh position={[SHEET_W + 0.012, base + rightThickness / 2, 0]}>
        <boxGeometry args={[0.012, rightThickness, SHEET_H - 0.04]} />
        <meshStandardMaterial color="#c4a35a" metalness={0.55} roughness={0.32} />
      </mesh>

      <Sheet side="left" page={staticLeft} y={sheetY} onClick={onPrev} ignoreClick={ignoreClick} />
      <Sheet side="right" page={staticRight} y={sheetY} onClick={onNext} ignoreClick={ignoreClick} />

      {turn && (
        <TurningSheet
          key={turn.token}
          front={turnFront}
          back={turnBack}
          dir={turn.dir}
          y={sheetY + 0.004}
          onDone={onTurnEnd}
        />
      )}

      {!turn &&
        entries.slice(0, 4).map((entry, index) => (
          <StudyEntryMarker
            key={entry.id}
            entry={entry}
            position={[
              -0.28 + index * 0.24,
              sheetY + 0.08,
              -SHEET_H / 2 - 0.02,
            ]}
            onSelect={onSelectEntry}
          />
        ))}
    </group>
  );
}
