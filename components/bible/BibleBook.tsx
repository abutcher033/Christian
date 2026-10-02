'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { LaidPage } from '@/lib/bible/pages';
import { getAmbience } from '@/lib/ambience/engine';
import { useLeatherTexture, usePageEdgeTexture } from './materials';
import { BOOK_TILT, SHEET_H, SHEET_W } from './metrics';
import { curlSheet, createLeaf, createPageMaterial, easePage } from './pageCurl';
import { pruneTextures, textureFor } from './pageTextures';

export type BibleBookHandle = {
  turn: (dir: 'next' | 'prev') => void;
};

type Curl = {
  dir: 'next' | 'prev';
  token: number;
  mode: 'auto' | 'drag';
};

type Anim = {
  dir: 'next' | 'prev';
  from: number;
  to: number;
  start: number;
  duration: number;
  commit: boolean;
};

type Props = {
  pages: LaidPage[];
  spread: number;
  spreadCount: number;
  onCommit: (dir: 'next' | 'prev') => void;
  reducedMotion: boolean;
  blocked: boolean;
  gestureRef: MutableRefObject<boolean>;
  onTurning: (active: boolean) => void;
};

const STACK_BASE = 0.055;

function Sheet({
  side,
  page,
  stack,
  onPointerDown,
  dimmed,
}: {
  side: 'left' | 'right';
  page: LaidPage | null;
  stack: MutableRefObject<{ y: number }>;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
  dimmed: boolean;
}) {
  const tex = useMemo(() => textureFor(page), [page]);
  const mesh = useRef<THREE.Mesh>(null);
  const x = side === 'right' ? SHEET_W / 2 : -SHEET_W / 2;

  useFrame(() => {
    if (mesh.current) mesh.current.position.y = stack.current.y;
  });

  return (
    <mesh
      ref={mesh}
      position={[x, stack.current.y, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      castShadow
      receiveShadow
      onPointerDown={onPointerDown}
      onPointerOver={(event) => {
        event.stopPropagation();
        if (!dimmed) document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <planeGeometry args={[SHEET_W, SHEET_H]} />
      <meshStandardMaterial map={tex} roughness={0.78} metalness={0} />
    </mesh>
  );
}

function TurningSheet({
  front,
  back,
  dir,
  progressRef,
  stack,
}: {
  front: LaidPage | null;
  back: LaidPage | null;
  dir: 'next' | 'prev';
  progressRef: MutableRefObject<number>;
  stack: MutableRefObject<{ y: number }>;
}) {
  const geo = useMemo(() => createLeaf(SHEET_W, SHEET_H), []);
  const frontTex = useMemo(() => textureFor(front), [front]);
  const backTex = useMemo(() => textureFor(back), [back]);
  const material = useMemo(() => createPageMaterial(frontTex, backTex, dir), [frontTex, backTex, dir]);
  const group = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);

  useEffect(() => {
    curlSheet(geo, 0, dir);
    return () => {
      geo.dispose();
      material.dispose();
    };
  }, [dir, geo, material]);

  useFrame(() => {
    const progress = progressRef.current;
    curlSheet(geo, progress, dir);
    if (group.current) group.current.position.y = stack.current.y + 0.006;
    const shadowMaterial = shadow.current?.material as THREE.MeshBasicMaterial | undefined;
    if (shadow.current && shadowMaterial) {
      const travel = Math.min(1, Math.max(0, progress));
      const strength = Math.sin(travel * Math.PI);
      const edge = Math.cos(travel * Math.PI) * SHEET_W;
      shadowMaterial.opacity = 0.26 * strength;
      shadow.current.position.x = (dir === 'next' ? 1 : -1) * edge * 0.42;
      shadow.current.scale.x = 0.35 + strength * 0.85;
    }
  });

  return (
    <group ref={group} position={[0, stack.current.y + 0.006, 0]}>
      <mesh
        ref={shadow}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[dir === 'next' ? -0.25 : 0.25, -0.012, 0]}
      >
        <planeGeometry args={[SHEET_W, SHEET_H * 0.92]} />
        <meshBasicMaterial color="#1a100c" transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh geometry={geo} material={material} castShadow />
    </group>
  );
}

function Stack({
  side,
  shown,
  spreadCount,
  leather,
  edge,
}: {
  side: 'left' | 'right';
  shown: MutableRefObject<number>;
  spreadCount: number;
  leather: THREE.Texture;
  edge: THREE.Texture;
}) {
  const block = useRef<THREE.Mesh>(null);
  const gilt = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const along = shown.current / Math.max(1, spreadCount - 1);
    const thickness = side === 'left' ? 0.028 + along * 0.06 : 0.028 + (1 - along) * 0.06;
    const x = side === 'left' ? -SHEET_W / 2 : SHEET_W / 2;
    const y = STACK_BASE + thickness / 2;
    if (block.current) {
      block.current.scale.y = thickness;
      block.current.position.set(x, y, 0);
    }
    if (gilt.current) {
      gilt.current.scale.y = thickness;
      gilt.current.position.set(side === 'left' ? -SHEET_W - 0.012 : SHEET_W + 0.012, y, 0);
    }
  });

  return (
    <>
      <mesh ref={block} castShadow receiveShadow>
        <boxGeometry args={[SHEET_W - 0.02, 1, SHEET_H - 0.03]} />
        <meshStandardMaterial map={edge} roughness={0.85} color="#f3eadc" />
      </mesh>
      <mesh ref={gilt}>
        <boxGeometry args={[0.012, 1, SHEET_H - 0.04]} />
        <meshStandardMaterial color="#c4a35a" metalness={0.55} roughness={0.32} />
      </mesh>
      <mesh position={[xCover(side), 0.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[SHEET_W + 0.1, 0.03, SHEET_H + 0.09]} />
        <meshStandardMaterial map={leather} roughness={0.62} metalness={0.06} />
      </mesh>
    </>
  );
}

function xCover(side: 'left' | 'right') {
  return side === 'left' ? -SHEET_W / 2 - 0.01 : SHEET_W / 2 + 0.01;
}

export const BibleBook = forwardRef<BibleBookHandle, Props>(function BibleBook(
  { pages, spread, spreadCount, onCommit, reducedMotion, blocked, gestureRef, onTurning },
  ref,
) {
  const gl = useThree((state) => state.gl);
  const leather = useLeatherTexture();
  const edge = usePageEdgeTexture();
  const [curl, setCurlState] = useState<Curl | null>(null);
  const curlRef = useRef<Curl | null>(null);
  const origin = useRef(spread);
  const progressRef = useRef(0);
  const animRef = useRef<Anim | null>(null);
  const shown = useRef(spread);
  const stack = useRef({ y: 0.16 });
  const rustled = useRef(false);

  const setCurl = (next: Curl | null) => {
    if (next && next.token !== curlRef.current?.token) origin.current = spread;
    curlRef.current = next;
    setCurlState(next);
    onTurning(next != null);
  };

  const begin = (dir: 'next' | 'prev', from: number, to: number, commit: boolean) => {
    if (reducedMotion) {
      if (commit && to >= 1) onCommit(dir);
      animRef.current = null;
      progressRef.current = 0;
      setCurl(null);
      return;
    }
    const distance = Math.abs(to - from);
    const duration = from === 0 && to === 1 ? 1.05 : Math.max(0.32, distance * 0.85);
    animRef.current = { dir, from, to, start: -1, duration, commit };
    progressRef.current = from;
    const current = curlRef.current;
    if (!current || current.dir !== dir) {
      setCurl({ dir, token: Date.now(), mode: 'auto' });
    } else if (current.mode !== 'auto') {
      setCurl({ ...current, mode: 'auto' });
    }
    if (commit && to >= 1 && from < 0.15) {
      rustled.current = false;
    }
  };

  useImperativeHandle(ref, () => ({
    turn(dir) {
      if (curlRef.current || animRef.current || blocked) return;
      if (dir === 'next' && spread >= spreadCount - 1) return;
      if (dir === 'prev' && spread <= 0) return;
      begin(dir, 0, 1, true);
    },
  }));

  useEffect(() => {
    animRef.current = null;
    progressRef.current = 0;
    setCurl(null);
  }, [spread]);

  useFrame((state, delta) => {
    const anim = animRef.current;
    if (anim) {
      if (anim.start < 0) anim.start = state.clock.elapsedTime;
      const t = Math.min(1, (state.clock.elapsedTime - anim.start) / anim.duration);
      progressRef.current = anim.from + (anim.to - anim.from) * easePage(t);
      if (!rustled.current && anim.commit && anim.to >= 1 && progressRef.current > 0.18) {
        rustled.current = true;
        getAmbience().rustle();
      }
      if (t >= 1) {
        progressRef.current = anim.to;
        animRef.current = null;
        const shouldCommit = anim.commit && anim.to >= 1;
        setCurl(null);
        if (shouldCommit) onCommit(anim.dir);
      }
    }

    const active = curlRef.current;
    const dir = active ? (active.dir === 'next' ? 1 : -1) : 0;
    const target = active ? spread + dir * progressRef.current : spread;
    if (active) shown.current = target;
    else shown.current += (spread - shown.current) * Math.min(1, delta * 8);

    const along = shown.current / Math.max(1, spreadCount - 1);
    const left = 0.028 + along * 0.06;
    const right = 0.028 + (1 - along) * 0.06;
    stack.current.y = STACK_BASE + Math.max(left, right) + 0.008;
  });

  const activeCurl = curl && spread === origin.current ? curl : null;
  const left = pages[spread * 2] ?? null;
  const right = pages[spread * 2 + 1] ?? null;
  const staticLeft = activeCurl?.dir === 'prev' ? (pages[spread * 2 - 2] ?? null) : left;
  const staticRight = activeCurl?.dir === 'next' ? (pages[spread * 2 + 3] ?? null) : right;
  const turnFront = activeCurl?.dir === 'next' ? right : left;
  const turnBack =
    activeCurl?.dir === 'next' ? (pages[spread * 2 + 2] ?? null) : (pages[spread * 2 - 1] ?? null);

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

  const onSheetDown = (side: 'left' | 'right') => (event: ThreeEvent<PointerEvent>) => {
    if (blocked || curlRef.current || animRef.current) return;
    const dir: 'next' | 'prev' = side === 'right' ? 'next' : 'prev';
    if (dir === 'next' && spread >= spreadCount - 1) return;
    if (dir === 'prev' && spread <= 0) return;
    event.stopPropagation();
    gestureRef.current = true;
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    let moved = false;
    let ignored = false;

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId || ignored) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved) {
        if (Math.hypot(dx, dy) < 14) return;
        if (Math.abs(dy) > Math.abs(dx) * 1.2) {
          ignored = true;
          return;
        }
        moved = true;
        progressRef.current = 0;
        rustled.current = false;
        setCurl({ dir, token: Date.now(), mode: 'drag' });
      }
      const widthPx = Math.max(200, gl.domElement.clientWidth * 0.3);
      const raw = dir === 'next' ? -dx / widthPx : dx / widthPx;
      progressRef.current = Math.min(1, Math.max(0, raw));
      if (!rustled.current && progressRef.current > 0.2) {
        rustled.current = true;
        getAmbience().rustle();
      }
    };

    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (ignored) return;
      if (!moved) {
        begin(dir, 0, 1, true);
        return;
      }
      const commit = progressRef.current > 0.34;
      begin(dir, progressRef.current, commit ? 1 : 0, commit);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  return (
    <group position={[0, 0.16, 0]} rotation={[BOOK_TILT, 0, 0]}>
      <Stack side="left" shown={shown} spreadCount={spreadCount} leather={leather} edge={edge} />
      <Stack side="right" shown={shown} spreadCount={spreadCount} leather={leather} edge={edge} />

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

      <Sheet
        side="left"
        page={staticLeft}
        stack={stack}
        onPointerDown={onSheetDown('left')}
        dimmed={spread <= 0}
      />
      <Sheet
        side="right"
        page={staticRight}
        stack={stack}
        onPointerDown={onSheetDown('right')}
        dimmed={spread >= spreadCount - 1}
      />

      {activeCurl && (
        <TurningSheet
          key={activeCurl.token}
          front={turnFront}
          back={turnBack}
          dir={activeCurl.dir}
          progressRef={progressRef}
          stack={stack}
        />
      )}
    </group>
  );
});
