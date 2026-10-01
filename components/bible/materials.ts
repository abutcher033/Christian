import { useMemo } from 'react';
import * as THREE from 'three';

function canvasTexture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare a material texture.');
  paint(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export function useWoodTexture() {
  return useMemo(
    () =>
      canvasTexture(512, 512, (ctx) => {
        ctx.fillStyle = '#6a431f';
        ctx.fillRect(0, 0, 512, 512);
        for (let y = 0; y < 512; y += 1) {
          const shade = 90 + Math.sin(y * 0.08) * 18 + (y % 7) * 1.5;
          ctx.fillStyle = `rgb(${shade + 30}, ${shade * 0.55}, ${shade * 0.28})`;
          ctx.fillRect(0, y, 512, 1);
        }
        for (let i = 0; i < 28; i += 1) {
          ctx.strokeStyle = `rgba(40, 18, 8, ${0.08 + Math.random() * 0.12})`;
          ctx.lineWidth = 1 + Math.random() * 2;
          ctx.beginPath();
          let y = Math.random() * 512;
          ctx.moveTo(0, y);
          for (let x = 0; x <= 512; x += 12) {
            y += Math.sin(x * 0.02 + i) * 1.4;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        for (let i = 0; i < 900; i += 1) {
          ctx.fillStyle = `rgba(255, 220, 170, ${Math.random() * 0.04})`;
          ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 1);
        }
      }),
    [],
  );
}

export function useLeatherTexture() {
  return useMemo(
    () =>
      canvasTexture(256, 256, (ctx) => {
        ctx.fillStyle = '#3a2218';
        ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 1800; i += 1) {
          ctx.fillStyle = `rgba(${40 + Math.random() * 40}, ${16 + Math.random() * 18}, ${10 + Math.random() * 10}, 0.35)`;
          ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.4, 1.4);
        }
      }),
    [],
  );
}

export function usePageEdgeTexture() {
  return useMemo(
    () =>
      canvasTexture(16, 128, (ctx) => {
        ctx.fillStyle = '#f4ecdf';
        ctx.fillRect(0, 0, 16, 128);
        for (let y = 0; y < 128; y += 2) {
          ctx.fillStyle = y % 4 === 0 ? '#e7d7c0' : '#fbf6ee';
          ctx.fillRect(0, y, 16, 1);
        }
        ctx.fillStyle = '#d7b56a';
        ctx.fillRect(14, 0, 2, 128);
      }),
    [],
  );
}
