// HD2D 氛围层：体积光、雾、粒子、暗角调色、火焰
import type { Particle } from './types';

export const VW = 480;
export const VH = 270;

export class ParticleSystem {
  list: Particle[] = [];

  spawn(p: Particle) { this.list.push(p); }

  update(dt: number) {
    for (const p of this.list) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'fire') { p.vy -= 30 * dt; p.vx *= 0.98; }
      if (p.kind === 'smoke') { p.vy -= 8 * dt; p.size += 6 * dt; }
      if (p.kind === 'spark') { p.vy += 140 * dt; }
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.list) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = p.kind === 'smoke' ? a * 0.25 : a * 0.85;
      ctx.fillStyle = p.color;
      const s = p.size;
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }
}

// 环境尘埃（地图场景漂浮的花粉/尘埃）
export function ambientDust(ps: ParticleSystem, time: number) {
  if (Math.random() < 0.12 && ps.list.length < 90) {
    ps.spawn({
      x: Math.random() * VW, y: Math.random() * VH,
      vx: -6 + Math.random() * 8, vy: -3 - Math.random() * 4,
      life: 3 + Math.random() * 3, maxLife: 6,
      size: 1 + Math.random() * 1.5,
      color: '#ffe9b0', kind: 'dust',
    });
  }
  void time;
}

// 火焰发射器
export function emitFire(ps: ParticleSystem, x: number, y: number, intensity: number) {
  for (let i = 0; i < intensity; i++) {
    const r = Math.random();
    ps.spawn({
      x: x + (Math.random() - 0.5) * 18,
      y: y + (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.5) * 10,
      vy: -18 - Math.random() * 22,
      life: 0.5 + Math.random() * 0.7, maxLife: 1.2,
      size: 2 + Math.random() * 3,
      color: r < 0.4 ? '#ffd94a' : r < 0.75 ? '#ff8c2e' : '#e84818',
      kind: 'fire',
    });
    if (Math.random() < 0.3) {
      ps.spawn({
        x, y: y - 6,
        vx: (Math.random() - 0.5) * 6,
        vy: -10 - Math.random() * 8,
        life: 1.4 + Math.random(), maxLife: 2.4,
        size: 4,
        color: '#3c3430', kind: 'smoke',
      });
    }
  }
}

// —— HD2D 后处理 ——
export function drawLightShafts(ctx: CanvasRenderingContext2D, time: number, warm = true) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  for (let i = 0; i < 4; i++) {
    const bx = 60 + i * 130 + Math.sin(time * 0.3 + i * 2) * 20;
    const g = ctx.createLinearGradient(bx, -20, bx + 90, VH + 40);
    g.addColorStop(0, warm ? 'rgba(255,220,140,0.16)' : 'rgba(140,180,255,0.10)');
    g.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(bx, -20);
    ctx.lineTo(bx + 46, -20);
    ctx.lineTo(bx + 136, VH + 40);
    ctx.lineTo(bx + 90, VH + 40);
    ctx.fill();
  }
  ctx.restore();
}

export function drawFog(ctx: CanvasRenderingContext2D, time: number) {
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const fx = ((time * 6 + i * 200) % (VW + 260)) - 130;
    const fy = VH * 0.55 + i * 30;
    const g = ctx.createRadialGradient(fx, fy, 10, fx, fy, 150);
    g.addColorStop(0, 'rgba(220,225,235,0.10)');
    g.addColorStop(1, 'rgba(220,225,235,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);
  }
  ctx.restore();
}

export function drawVignette(ctx: CanvasRenderingContext2D, grade = 'warm') {
  const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.42, VW / 2, VH / 2, VH * 0.95);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(8,6,16,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VW, VH);
  // 暖色调色
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = grade === 'warm' ? 'rgba(255,190,90,0.10)' : 'rgba(80,110,200,0.12)';
  ctx.fillRect(0, 0, VW, VH);
  ctx.globalCompositeOperation = 'source-over';
}

// 命中火花
export function emitHit(ps: ParticleSystem, x: number, y: number, color = '#ffe9a8') {
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 80;
    ps.spawn({
      x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
      life: 0.3 + Math.random() * 0.3, maxLife: 0.6,
      size: 1 + Math.random() * 2,
      color, kind: 'spark',
    });
  }
}

// —— HD2D 动态氛围 ——

// 摇曳的环境光晕（叠加在画面上，让光"呼吸"）
export function drawGlowPulse(
  ctx: CanvasRenderingContext2D, time: number,
  spots: { x: number; y: number; r: number; color: string }[],
) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  for (const s of spots) {
    const a = 0.5 + 0.5 * Math.sin(time * 1.6 + s.x * 0.37);
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
    g.addColorStop(0, s.color.replace('ALPHA', (0.16 + a * 0.14).toFixed(3)));
    g.addColorStop(1, s.color.replace('ALPHA', '0'));
    ctx.fillStyle = g;
    ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
  }
  ctx.restore();
}

// 横向流动雾带（河谷晨雾/战场硝烟）
export function drawMistBands(ctx: CanvasRenderingContext2D, time: number, yBase: number, color: string, alpha = 0.10) {
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const speed = 8 + i * 3;
    const w = 200 + i * 60;
    const x = ((time * speed + i * 340) % (VW + w * 2)) - w;
    const y = yBase + Math.sin(time * 0.4 + i * 1.7) * 8 + i * 12;
    const g = ctx.createRadialGradient(x, y, 0, x, y, w / 2);
    g.addColorStop(0, color.replace('ALPHA', (alpha - i * 0.015).toFixed(3)));
    g.addColorStop(1, color.replace('ALPHA', '0'));
    ctx.fillStyle = g;
    ctx.fillRect(x - w / 2, y - w / 2, w, w);
  }
  ctx.restore();
}

// 底部景深压暗带（tilt-shift 焦外暗角，成本低）
export function drawDepthBlur(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, yFrom: number) {
  void img;
  const g = ctx.createLinearGradient(0, yFrom, 0, VH);
  g.addColorStop(0, 'rgba(10,8,14,0)');
  g.addColorStop(1, 'rgba(10,8,14,0.30)');
  ctx.fillStyle = g;
  ctx.fillRect(0, yFrom, VW, VH - yFrom);
}

// 飘落物：枫叶/花瓣/余烬
export function emitFallen(
  ps: ParticleSystem, kind: 'maple' | 'petal' | 'ember',
  camX = 0, camY = 0,
) {
  if (kind === 'ember') {
    if (Math.random() > 0.5) return;
    ps.spawn({
      x: camX + Math.random() * VW, y: camY + VH + 4,
      vx: -6 + Math.random() * 12, vy: -26 - Math.random() * 20,
      life: 1.5 + Math.random() * 1.5, maxLife: 3,
      size: 0.8 + Math.random() * 1.2,
      color: Math.random() < 0.5 ? '#ffb84a' : '#ff7a2e', kind: 'dust',
    });
    return;
  }
  const prob = kind === 'petal' ? 0.22 : 0.10;
  if (Math.random() > prob) return;
  ps.spawn({
    x: camX + Math.random() * (VW + 60) - 30, y: camY - 4,
    vx: 4 + Math.random() * 10, vy: 12 + Math.random() * 8,
    life: 5 + Math.random() * 3, maxLife: 8,
    size: 1 + Math.random() * 1.4,
    color: kind === 'petal'
      ? (Math.random() < 0.5 ? '#ffc2d2' : '#ff9ab8')
      : (Math.random() < 0.5 ? '#e86a3c' : '#d8922e'),
    kind: 'dust',
  });
}
