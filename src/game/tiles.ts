// 瓦片绘制 —— 程序化像素瓦片，HD2D 风格含光照
import type { TileChar } from './types';

export const TILE = 30;

// 确定性伪随机
function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 974634) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, ((n >> 16) & 255) * f)) | 0;
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) * f)) | 0;
  const b = Math.min(255, Math.max(0, (n & 255) * f)) | 0;
  return `rgb(${r},${g},${b})`;
}

export function drawTile(
  ctx: CanvasRenderingContext2D,
  t: TileChar, tx: number, ty: number, px: number, py: number,
  time: number,
) {
  const s = TILE;
  const r1 = hash(tx, ty, 1), r2 = hash(tx, ty, 2), r3 = hash(tx, ty, 3);
  switch (t) {
    case 'G': case 'S': {
      ctx.fillStyle = shade('#4a7a34', 0.92 + r1 * 0.16);
      ctx.fillRect(px, py, s, s);
      // 草叶点缀
      ctx.fillStyle = shade('#5c9440', 0.9 + r2 * 0.2);
      for (let i = 0; i < 5; i++) {
        const gx = px + ((hash(tx, ty, 10 + i) * 26) | 0);
        const gy = py + ((hash(tx, ty, 20 + i) * 26) | 0);
        ctx.fillRect(gx, gy, 2, 3);
      }
      if (t === 'S') {
        // 花丛
        const cols = ['#e8d84a', '#e8e8e8', '#d86a8c'];
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = cols[(hash(tx, ty, 30 + i) * 3) | 0];
          ctx.fillRect(px + 4 + ((hash(tx, ty, 40 + i) * 20) | 0), py + 4 + ((hash(tx, ty, 50 + i) * 20) | 0), 3, 3);
        }
      }
      break;
    }
    case 'P': {
      ctx.fillStyle = shade('#8a6a44', 0.9 + r1 * 0.2);
      ctx.fillRect(px, py, s, s);
      ctx.fillStyle = shade('#6e5334', 0.9 + r2 * 0.2);
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(px + ((hash(tx, ty, 60 + i) * 24) | 0), py + ((hash(tx, ty, 70 + i) * 24) | 0), 3, 2);
      }
      break;
    }
    case 'T': {
      // 草地基底 + 树
      ctx.fillStyle = shade('#40702c', 0.9 + r1 * 0.2);
      ctx.fillRect(px, py, s, s);
      const sway = Math.sin(time * 1.5 + tx * 0.7 + ty) * 1.2;
      ctx.fillStyle = shade('#2c5420', 0.85 + r2 * 0.3);
      ctx.beginPath();
      ctx.ellipse(px + s / 2 + sway, py + 11, 12, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade('#3c6c2c', 0.85 + r3 * 0.3);
      ctx.beginPath();
      ctx.ellipse(px + s / 2 - 2 + sway, py + 8, 8, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a3826';
      ctx.fillRect(px + s / 2 - 2, py + 18, 4, 10);
      break;
    }
    case 'R': {
      ctx.fillStyle = shade('#5a5a62', 0.85 + r1 * 0.3);
      ctx.fillRect(px, py, s, s);
      ctx.fillStyle = shade('#48484f', 0.85 + r2 * 0.3);
      ctx.beginPath();
      ctx.moveTo(px, py + s);
      ctx.lineTo(px + s * 0.3, py + 6);
      ctx.lineTo(px + s * 0.7, py + 6);
      ctx.lineTo(px + s, py + s);
      ctx.fill();
      ctx.fillStyle = shade('#707078', 0.9 + r3 * 0.2);
      ctx.beginPath();
      ctx.moveTo(px + s * 0.3, py + 6);
      ctx.lineTo(px + s * 0.5, py + 2);
      ctx.lineTo(px + s * 0.7, py + 6);
      ctx.fill();
      break;
    }
    case 'W': {
      const wob = Math.sin(time * 2 + tx + ty) * 0.08;
      ctx.fillStyle = shade('#2a5a9c', 0.85 + r1 * 0.1 + wob);
      ctx.fillRect(px, py, s, s);
      ctx.fillStyle = `rgba(140,190,235,${0.25 + 0.15 * Math.sin(time * 2.4 + tx * 1.3)})`;
      ctx.fillRect(px + 3, py + 8 + ((r2 * 10) | 0), s - 8, 2);
      ctx.fillRect(px + 8, py + 18 + ((r3 * 6) | 0), s - 14, 2);
      break;
    }
    case 'B': {
      ctx.fillStyle = '#2a5a9c';
      ctx.fillRect(px, py, s, s);
      ctx.fillStyle = shade('#8a6a44', 0.95 + r1 * 0.1);
      ctx.fillRect(px, py + 2, s, s - 4);
      ctx.fillStyle = shade('#6e5334', 1);
      for (let i = 0; i < 4; i++) ctx.fillRect(px + 2 + i * 8, py + 2, 2, s - 4);
      break;
    }
  }
}

export function passable(t: TileChar): boolean {
  return t === 'G' || t === 'S' || t === 'P' || t === 'B';
}
