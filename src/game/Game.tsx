// 吞食天地II 诸葛孔明传 HD2D —— 主控
import { useEffect, useRef, useState } from 'react';
import type { SceneId, Unit } from './types';
import { FIELD_MAP, MAP_W, MAP_H, START_POS, SCOUT_TRIGGER, MAIN_TRIGGER, INTRO_DIALOG, ENDING_DIALOG, BATTLE_INTRO, VICTORY_MSG, makeParty } from './data';
import { passable, TILE } from './tiles';
import { preloadBg, drawBgCover, getBg } from './bg';
import { drawUnit, unitVariant, drawSpriteUnit, preloadSprites } from './sprites';
import { ParticleSystem, ambientDust, drawLightShafts, drawFog, drawVignette, drawGlowPulse, drawMistBands, drawDepthBlur, emitFallen, VW, VH } from './effects';
import { createBattle, battleInput, updateBattle, drawBattle } from './battle';
import type { BattleState } from './types';
import { initAudio, sfx } from './sfx';
import { emitOst, toggleOst } from './ost';
import { squeekGlobal } from './squeekBridge';

interface FieldState {
  px: number; py: number;       // 像素坐标（中心）
  tx: number; ty: number;       // 所在瓦片
  moving: boolean;
  mx: number; my: number;       // 移动目标像素
  dir: 'up' | 'down' | 'left' | 'right';
  walkT: number;
  trail: { x: number; y: number }[];  // 跟随轨迹
  scoutDone: boolean;
  banner: string;
  bannerT: number;
}

interface GameState {
  scene: SceneId;
  party: Unit[];
  field: FieldState;
  battle: BattleState | null;
  dlgIdx: number;
  dlgChars: number;
  time: number;
  titleT: number;
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    if (!booted) return;
    const cv = canvasRef.current!;
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const ps = new ParticleSystem();
    const keys = new Set<string>();
    ['title', 'intro', 'field', 'battle_main', 'ending'].forEach(preloadBg);
    preloadSprites();

    const g: GameState = {
      scene: 'title',
      party: makeParty(),
      field: {
        px: START_POS.x * TILE + TILE / 2, py: START_POS.y * TILE + TILE / 2,
        tx: START_POS.x, ty: START_POS.y,
        moving: false, mx: 0, my: 0, dir: 'up', walkT: 0,
        trail: [], scoutDone: false, banner: '🐹 目标：借 Squeekchain 跑轮算力穿过峡谷，伏击夏侯惇军！', bannerT: 5,
      },
      battle: null,
      dlgIdx: 0, dlgChars: 0, time: 0, titleT: 0,
    };

    const keyMap: Record<string, string> = {
      ArrowUp: 'up', KeyW: 'up',
      ArrowDown: 'down', KeyS: 'down',
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right',
      Enter: 'confirm', KeyZ: 'confirm', Space: 'confirm',
      Escape: 'cancel', KeyX: 'cancel',
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') {
        toggleOst();
        return;
      }
      const k = keyMap[e.code];
      if (!k) return;
      e.preventDefault();
      initAudio();
      if (e.repeat) { keys.add(k); return; }
      keys.add(k);
      handlePress(k);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = keyMap[e.code];
      if (k) keys.delete(k);
    };

    const trackFor = (scene: SceneId): string => {
      if (scene === 'battle') return g.battle?.battleId === 'main' ? 'main' : 'battle';
      if (scene === 'demoend') return 'demoend';
      if (scene === 'ending') return 'ending';
      if (scene === 'field') return 'field';
      if (scene === 'intro') return 'intro';
      return 'title';
    };

    function startBattle(id: string) {
      g.battle = createBattle(id, g.party);
      g.battle.msg = BATTLE_INTRO[id] || '';
      g.scene = 'battle';
      emitOst(id === 'main' ? 'main' : 'battle');
    }

    function endBattle() {
      const b = g.battle!;
      if (b.phase === 'victory') {
        emitOst('victory');
        // 同步兵力回 party
        b.allies.forEach((u, i) => { g.party[i].troops = u.troops; g.party[i].sp = u.sp; });
        if (b.battleId === 'scout') {
          g.field.scoutDone = true;
          g.party.forEach((u) => { u.sp = Math.min(u.maxSp, u.sp + 8); });
          g.scene = 'field';
          g.field.banner = VICTORY_MSG.scout;
          g.field.bannerT = 4;
          setTimeout(() => { if (g.scene === 'field') emitOst('field'); }, 3500);
        } else {
          g.scene = 'ending';
          g.dlgIdx = 0; g.dlgChars = 0;
          setTimeout(() => { if (g.scene === 'ending') emitOst('ending'); }, 3500);
        }
      } else if (b.phase === 'defeat') {
        // 败北：重来（回复满）
        g.party = makeParty();
        g.battle = null;
        g.scene = 'title';
        g.titleT = 0;
        emitOst('title');
        return;
      } else if (b.phase === 'flee') {
        b.allies.forEach((u, i) => { g.party[i].troops = u.troops; g.party[i].sp = u.sp; });
        g.scene = 'field';
        g.field.banner = '撤退成功……整顿旗鼓再战！';
        g.field.bannerT = 3;
        emitOst('field');
      }
      g.battle = null;
    }

    let bgmStarted = false;
    function handlePress(k: string) {
      if (!bgmStarted) { bgmStarted = true; emitOst(trackFor(g.scene)); }
      switch (g.scene) {
        case 'title':
          if (k === 'confirm' && g.titleT > 0.5) { sfx.confirm(); g.scene = 'intro'; g.dlgIdx = 0; g.dlgChars = 0; emitOst('intro'); }
          break;
        case 'intro':
        case 'ending': {
          const lines = g.scene === 'intro' ? INTRO_DIALOG : ENDING_DIALOG;
          if (k === 'confirm') {
            const cur = lines[g.dlgIdx];
            if (g.dlgChars < cur.text.length) { g.dlgChars = cur.text.length; break; }
            sfx.confirm();
            if (g.dlgIdx < lines.length - 1) { g.dlgIdx++; g.dlgChars = 0; }
            else if (g.scene === 'intro') { g.scene = 'field'; g.field.banner = '🐹 目标：借 Squeekchain 跑轮算力穿过峡谷，伏击夏侯惇军！'; g.field.bannerT = 5; emitOst('field'); }
            else { g.scene = 'demoend'; emitOst('demoend'); }
          }
          break;
        }
        case 'battle':
          if (g.battle) battleInput(g.battle, k, ps);
          break;
        case 'demoend':
          if (k === 'confirm') { g.scene = 'title'; g.titleT = 0; g.party = makeParty(); g.field.scoutDone = false; g.field.tx = START_POS.x; g.field.ty = START_POS.y; g.field.px = START_POS.x * TILE + TILE / 2; g.field.py = START_POS.y * TILE + TILE / 2; g.field.trail = []; emitOst('title'); }
          break;
      }
    }

    // —— 地图移动 ——
    const MOVE_SPEED = 90;
    function updateField(dt: number) {
      const f = g.field;
      if (f.bannerT > 0) f.bannerT -= dt;
      if (f.moving) {
        const dx = f.mx - f.px, dy = f.my - f.py;
        const dist = Math.hypot(dx, dy);
        const step = MOVE_SPEED * dt;
        if (dist <= step) {
          f.px = f.mx; f.py = f.my; f.moving = false;
          f.trail.unshift({ x: f.px, y: f.py });
          if (f.trail.length > 60) f.trail.pop();
          sfx.step();
          checkTrigger();
        } else {
          f.px += (dx / dist) * step;
          f.py += (dy / dist) * step;
          f.walkT += dt;
        }
        return;
      }
      // 读取方向键
      let dx = 0, dy = 0;
      if (keys.has('up')) dy = -1;
      else if (keys.has('down')) dy = 1;
      else if (keys.has('left')) dx = -1;
      else if (keys.has('right')) dx = 1;
      if (dx === 0 && dy === 0) return;
      const ntx = f.tx + dx, nty = f.ty + dy;
      f.dir = dy < 0 ? 'up' : dy > 0 ? 'down' : dx < 0 ? 'left' : 'right';
      if (ntx < 0 || nty < 0 || ntx >= MAP_W || nty >= MAP_H) return;
      if (!passable(FIELD_MAP[nty][ntx])) return;
      f.tx = ntx; f.ty = nty;
      f.mx = ntx * TILE + TILE / 2; f.my = nty * TILE + TILE / 2;
      f.moving = true;
    }

    function checkTrigger() {
      const f = g.field;
      // 先锋战：踏上桥面北段任意一格
      if (!f.scoutDone && f.ty <= SCOUT_TRIGGER.y + 1 && f.ty >= SCOUT_TRIGGER.y - 2 && f.tx >= 10 && f.tx <= 13) startBattle('scout');
      // 主力战：走出山口
      else if (f.scoutDone && f.ty <= MAIN_TRIGGER.y + 1 && f.tx >= 9 && f.tx <= 13) startBattle('main');
    }

    // —— 渲染 ——
    function drawTitle(time: number) {
      // 桃园结义 HD2D 背景（缓慢推近）
      if (!drawBgCover(ctx, 'title', 0, 0, VW, VH, 1.08 + 0.025 * Math.sin(time * 0.25))) {
        const grd = ctx.createLinearGradient(0, 0, 0, VH);
        grd.addColorStop(0, '#0a0818');
        grd.addColorStop(0.6, '#1c1030');
        grd.addColorStop(1, '#3c1a20');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, VW, VH);
      }
      // 上下压暗，突出标题文字
      const shade = ctx.createLinearGradient(0, 0, 0, VH);
      shade.addColorStop(0, 'rgba(8,4,10,0.62)');
      shade.addColorStop(0.32, 'rgba(8,4,10,0.05)');
      shade.addColorStop(0.68, 'rgba(8,4,10,0.05)');
      shade.addColorStop(1, 'rgba(8,4,10,0.66)');
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, VW, VH);
      // 摇曳光晕 + 飘落的花瓣
      drawGlowPulse(ctx, time, [
        { x: 250, y: 120, r: 180, color: 'rgba(255,190,110,ALPHA)' },
        { x: 90, y: 60, r: 120, color: 'rgba(255,150,140,ALPHA)' },
      ]);
      emitFallen(ps, 'petal');
      ps.draw(ctx);
      drawLightShafts(ctx, time, true);

      ctx.textAlign = 'center';
      // 标题上方画仓鼠图标
      ctx.font = '24px monospace';
      ctx.fillText('🐹', VW / 2, 54);

      ctx.font = 'bold 30px monospace';
      ctx.fillStyle = '#000';
      ctx.fillText('SQUEEK WARRIORS', VW / 2 + 2, 88);
      const tg = ctx.createLinearGradient(0, 60, 0, 100);
      tg.addColorStop(0, '#ffe9a8'); tg.addColorStop(0.5, '#e8a03c'); tg.addColorStop(1, '#a05a1c');
      ctx.fillStyle = tg;
      ctx.fillText('SQUEEK WARRIORS', VW / 2, 86);

      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#000';
      ctx.fillText('仓鼠诸葛 · 吞食天地 HD2D', VW / 2 + 2, 116);
      ctx.fillStyle = '#d8e8ff';
      ctx.fillText('仓鼠诸葛 · 吞食天地 HD2D', VW / 2, 114);

      ctx.font = '9px monospace';
      ctx.fillStyle = '#000';
      ctx.fillText('— Powered by Squeekchain PoW Live Hashrate —', VW / 2 + 1, 137);
      ctx.fillStyle = '#ffd15c';
      ctx.fillText('— Powered by Squeekchain PoW Live Hashrate —', VW / 2, 136);

      ctx.font = '8px monospace';
      ctx.fillStyle = '#000';
      ctx.fillText('博望坡之战 · 仓鼠转速实时加持全军战力', VW / 2 + 1, 155);
      ctx.fillStyle = '#b8c4d8';
      ctx.fillText('博望坡之战 · 仓鼠转速实时加持全军战力', VW / 2, 154);
      if (Math.sin(time * 3) > -0.2) {
        ctx.font = '12px monospace';
        ctx.fillStyle = '#000';
        ctx.fillText('按 Enter 或 点击屏幕 开始', VW / 2 + 1, 201);
        ctx.fillStyle = '#ffe9a8';
        ctx.fillText('按 Enter 或 点击屏幕 开始', VW / 2, 200);
      }
      ctx.font = '8px monospace';
      ctx.fillStyle = '#000';
      ctx.fillText('键盘移动: 方向键/WASD · 确认: Enter/Z/点击 · 取消: X/Esc · 音乐: M', VW / 2 + 1, 251);
      ctx.fillStyle = '#b8c4d8';
      ctx.fillText('键盘移动: 方向键/WASD · 确认: Enter/Z/点击 · 取消: X/Esc · 音乐: M', VW / 2, 250);
      drawVignette(ctx, 'cool');
    }

    function drawIntroBackdrop(ending: boolean, time: number) {
      // 结局：山巅望山河 / 开场：雪夜草庐（缓慢横移取景）
      const id = ending ? 'ending' : 'intro';
      const fx = 0.5 + 0.06 * Math.sin(time * 0.12);
      if (!drawBgCover(ctx, id, 0, 0, VW, VH, 1.05, fx, 0.5)) {
        const grd = ctx.createLinearGradient(0, 0, 0, VH);
        if (ending) {
          grd.addColorStop(0, '#1a0e14'); grd.addColorStop(0.5, '#5c2418'); grd.addColorStop(1, '#c86a2e');
        } else {
          grd.addColorStop(0, '#060a1c'); grd.addColorStop(0.6, '#101c3c'); grd.addColorStop(1, '#1c2c4c');
        }
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, VW, VH);
      }
      if (ending) {
        // 云海微光 + 流动云雾
        if (Math.random() < 0.2) {
          ps.spawn({ x: Math.random() * VW, y: 150 + Math.random() * 60, vx: 4 + Math.random() * 6, vy: -2 - Math.random() * 3, life: 2.5 + Math.random() * 2, maxLife: 4.5, size: 1.2 + Math.random() * 1.6, color: '#ffe8c8', kind: 'dust' });
        }
        drawMistBands(ctx, time, 175, 'rgba(255,236,210,ALPHA)', 0.13);
        drawGlowPulse(ctx, time, [{ x: 330, y: 60, r: 200, color: 'rgba(255,214,150,ALPHA)' }]);
        drawLightShafts(ctx, time, true);
        drawFog(ctx, time);
      } else {
        // 飘雪 + 茅庐灯火呼吸
        if (Math.random() < 0.55) {
          ps.spawn({ x: Math.random() * (VW + 40) - 20, y: -3, vx: -4 - Math.random() * 8 + Math.sin(time) * 3, vy: 11 + Math.random() * 10, life: 4 + Math.random() * 3, maxLife: 7, size: 0.8 + Math.random() * 1.2, color: '#e8f0ff', kind: 'dust' });
        }
        drawGlowPulse(ctx, time, [
          { x: 300, y: 150, r: 90, color: 'rgba(255,190,110,ALPHA)' },
          { x: 140, y: 185, r: 60, color: 'rgba(255,180,100,ALPHA)' },
        ]);
        drawMistBands(ctx, time, 200, 'rgba(180,200,235,ALPHA)', 0.07);
      }
      ps.draw(ctx);
      drawVignette(ctx, ending ? 'warm' : 'cool');
    }

    function drawDialog(lines: typeof INTRO_DIALOG, time: number) {
      const cur = lines[g.dlgIdx];
      const shown = cur.text.slice(0, Math.floor(g.dlgChars));
      // 窗口
      ctx.fillStyle = 'rgba(8,12,36,0.92)';
      ctx.fillRect(30, VH - 96, VW - 60, 84);
      ctx.strokeStyle = '#e8e8f0'; ctx.lineWidth = 1;
      ctx.strokeRect(30.5, VH - 95.5, VW - 61, 83);
      ctx.strokeStyle = '#5a6ac8';
      ctx.strokeRect(33.5, VH - 92.5, VW - 67, 77);
      ctx.textAlign = 'left';
      let y0 = VH - 72;
      if (cur.speaker) {
        ctx.fillStyle = cur.color || '#ffe9a8';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`【${cur.speaker}】`, 42, VH - 78);
        y0 = VH - 62;
      }
      ctx.font = '10px monospace';
      ctx.fillStyle = '#f0f0f8';
      shown.split('\n').forEach((ln, i) => ctx.fillText(ln, 42, y0 + i * 14));
      if (g.dlgChars >= cur.text.length && Math.sin(time * 4) > 0) {
        ctx.fillStyle = '#ffe94a';
        ctx.fillText('▼', VW - 52, VH - 22);
      }
    }

    // 单位地面投影 + 暖色轮廓光（HD2D 质感）
    function drawUnitHD(u: Unit, x: number, y: number, dir: string, frame: number, walkT: number, alpha = 1) {
      ctx.fillStyle = 'rgba(12,8,4,0.35)';
      ctx.beginPath();
      ctx.ellipse(x, y + 3, 13, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.shadowColor = 'rgba(255,206,130,0.45)';
      ctx.shadowBlur = 6;
      const ok = drawSpriteUnit(ctx, u.id, x, y, 46, {
        view: dir === 'up' ? 'back' : 'front',
        flip: dir === 'left',
        alpha,
        walkT,
        bob: g.time + x * 0.1,
      });
      ctx.restore();
      if (!ok) drawUnit(ctx, u.palette, unitVariant(u.id), x, y, 2, dir === 'left', frame, alpha);
    }

    function drawField(time: number) {
      const f = g.field;
      // 相机
      const camX = Math.max(0, Math.min(MAP_W * TILE - VW, f.px - VW / 2));
      const camY = Math.max(0, Math.min(MAP_H * TILE - VH, f.py - VH / 2));

      // 博望峡谷黄昏画景铺满整张地图
      const worldW = MAP_W * TILE, worldH = MAP_H * TILE;
      if (!drawBgCover(ctx, 'field', -camX, -camY, worldW, worldH, 1, 0.5, 0.55)) {
        ctx.fillStyle = '#3c2a1a';
        ctx.fillRect(0, 0, VW, VH);
      }

      // 碰撞明暗层：不可通行处压暗，道路留亮
      const x0 = Math.floor(camX / TILE), y0 = Math.floor(camY / TILE);
      const x1 = Math.min(MAP_W - 1, x0 + Math.ceil(VW / TILE) + 1);
      const y1 = Math.min(MAP_H - 1, y0 + Math.ceil(VH / TILE) + 1);
      for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          const sx = tx * TILE - camX, sy = ty * TILE - camY;
          const ch = FIELD_MAP[ty][tx];
          if (ch === 'W') {
            // 水面微光
            ctx.fillStyle = `rgba(120,180,255,${0.10 + 0.05 * Math.sin(time * 2 + tx + ty)})`;
            ctx.fillRect(sx, sy, TILE, TILE);
          } else if (!passable(ch)) {
            ctx.fillStyle = 'rgba(10,6,14,0.38)';
            ctx.fillRect(sx, sy, TILE, TILE);
          } else {
            ctx.fillStyle = 'rgba(255,214,140,0.05)';
            ctx.fillRect(sx, sy, TILE, TILE);
          }
        }
      }

      ambientDust(ps, time);
      emitFallen(ps, 'maple', camX, camY);
      ps.draw(ctx);

      // 队伍（跟随者沿轨迹）
      const frame = f.moving && Math.floor(f.walkT * 8) % 2 === 0 ? 1 : 0;
      const followers = g.party.slice(1);
      followers.forEach((u, i) => {
        const t = f.trail[Math.min(f.trail.length - 1, (i + 1) * 12)];
        if (!t) return;
        drawUnitHD(u, t.x - camX, t.y + 10 - camY, f.dir, frame, f.moving ? f.walkT : 0, 0.95);
      });
      const leader = g.party[0];
      drawUnitHD(leader, f.px - camX, f.py + 10 - camY, f.dir, frame, f.moving ? f.walkT : 0);

      // HD2D 氛围：景深模糊 + 河谷流雾 + 呼吸光晕 + 扫动光柱
      drawDepthBlur(ctx, getBg('field'), 208);
      drawMistBands(ctx, time, 190, 'rgba(255,224,180,ALPHA)', 0.09);
      drawGlowPulse(ctx, time, [{ x: 260, y: 90, r: 220, color: 'rgba(255,200,120,ALPHA)' }]);
      drawLightShafts(ctx, time, true);
      drawFog(ctx, time);
      drawVignette(ctx, 'warm');

      // HUD
      ctx.textAlign = 'left';
      ctx.font = '9px monospace';
      ctx.fillStyle = 'rgba(8,12,36,0.85)';
      ctx.fillRect(6, 6, 176, 54);
      ctx.strokeStyle = '#e8e8f0';
      ctx.strokeRect(6.5, 6.5, 175, 53);
      g.party.forEach((u, i) => {
        ctx.fillStyle = '#ffe9a8';
        ctx.fillText(u.name, 12, 19 + i * 12);
        ctx.fillStyle = '#fff';
        ctx.fillText(`${Math.round(u.troops)}`, 50, 19 + i * 12);
        ctx.fillStyle = '#7ec8ff';
        ctx.fillText(`SP${u.sp}`, 105, 19 + i * 12);
      });

      // Squeekchain 实时生态状态小贴士（地图界面）
      ctx.fillStyle = 'rgba(11,19,22,0.85)';
      ctx.fillRect(VW - 138, 6, 132, 22);
      ctx.strokeStyle = squeekGlobal.coreStatus === 'RUNNING' ? '#4ade80' : '#e8a03c';
      ctx.strokeRect(VW - 137.5, 6.5, 131, 21);
      ctx.font = '8px monospace';
      ctx.fillStyle = squeekGlobal.coreStatus === 'RUNNING' ? '#4ade80' : '#ffd15c';
      ctx.fillText(`🐹 仓鼠:${squeekGlobal.coreStatus === 'RUNNING' ? '狂奔中' : '休眠'} (${squeekGlobal.rpm}RPM)`, VW - 132, 17);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`⚡战力加成: +${Math.round((squeekGlobal.atkMultiplier - 1) * 100)}%`, VW - 132, 25);
      if (f.bannerT > 0) {
        ctx.fillStyle = 'rgba(8,12,36,0.9)';
        const bw = 300;
        ctx.fillRect((VW - bw) / 2, VH - 34, bw, 24);
        ctx.strokeStyle = '#e8e8f0';
        ctx.strokeRect((VW - bw) / 2 + 0.5, VH - 33.5, bw - 1, 23);
        ctx.fillStyle = '#ffe9a8';
        ctx.textAlign = 'center';
        ctx.font = '9px monospace';
        f.banner.split('\n').forEach((ln, i) => ctx.fillText(ln, VW / 2, VH - 24 + i * 11));
      }
    }

    function drawDemoEnd(time: number) {
      if (!drawBgCover(ctx, 'title', 0, 0, VW, VH, 1.1 + 0.02 * Math.sin(time * 0.2))) {
        ctx.fillStyle = '#060610';
        ctx.fillRect(0, 0, VW, VH);
      }
      ctx.fillStyle = 'rgba(6,6,16,0.62)';
      ctx.fillRect(0, 0, VW, VH);
      ctx.textAlign = 'center';
      ctx.font = 'bold 24px monospace';
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText('🏆 Squeekchain Demo 通关！', VW / 2, 85);
      ctx.font = '11px monospace';
      ctx.fillStyle = '#c8d8f0';
      ctx.fillText('火烧博望坡 · 创世算力战役告捷', VW / 2, 110);
      
      // Squeekchain 结算奖励卡
      ctx.fillStyle = 'rgba(11,19,22,0.85)';
      ctx.fillRect(VW / 2 - 140, 125, 280, 52);
      ctx.strokeStyle = '#e8a03c';
      ctx.lineWidth = 1;
      ctx.strokeRect(VW / 2 - 139.5, 125.5, 279, 51);

      ctx.fillStyle = '#ffd15c';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('🐹 Squeekchain Builder Reward 获得', VW / 2, 142);
      ctx.font = '9px monospace';
      ctx.fillStyle = '#7ec8ff';
      ctx.fillText('+500 $SQK PoW Credits  |  Genesis Aura +120', VW / 2, 160);

      ctx.fillStyle = '#8a9ac8';
      ctx.font = '8px monospace';
      ctx.fillText('未完待续：赤壁之战 · 全网算力大共识……', VW / 2, 192);
      if (Math.sin(time * 3) > 0) {
        ctx.fillStyle = '#ffe9a8';
        ctx.font = '10px monospace';
        ctx.fillText('按 Enter 回到标题', VW / 2, 218);
      }
      drawVignette(ctx, 'cool');
    }

    // —— 主循环 ——
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      g.time += dt;
      const time = g.time;
      (window as unknown as { __scene: string }).__scene = g.scene + (g.battle ? ':' + g.battle.phase : '');

      switch (g.scene) {
        case 'title':
          g.titleT += dt;
          ps.update(dt);
          drawTitle(time);
          break;
        case 'intro':
          g.dlgChars += dt * 18;
          ps.update(dt);
          drawIntroBackdrop(false, time);
          drawDialog(INTRO_DIALOG, time);
          break;
        case 'ending':
          g.dlgChars += dt * 18;
          ps.update(dt);
          drawIntroBackdrop(true, time);
          drawDialog(ENDING_DIALOG, time);
          break;
        case 'field':
          updateField(dt);
          ps.update(dt);
          drawField(time);
          break;
        case 'battle':
          if (g.battle) {
            updateBattle(g.battle, dt, ps);
            ps.update(dt);
            drawBattle(ctx, g.battle, ps, time);
            const b = g.battle;
            if ((b.phase === 'victory' || b.phase === 'defeat' || b.phase === 'flee') && b.msgT <= 0) endBattle();
          }
          break;
        case 'demoend':
          drawDemoEnd(time);
          break;
      }
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [booted]);

  if (!booted) {
    return (
      <button
        className="w-full h-full flex flex-col items-center justify-center bg-black cursor-pointer select-none"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${import.meta.env.BASE_URL || '/'}bg/title.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        onClick={() => {
          // 同一次点击手势内直接播放（浏览器手势内 play() 必定允许发声）
          emitOst('title');
          setBooted(true);
        }}
      >
        <div className="text-6xl mb-3 animate-bounce">
          🐹
        </div>
        <div className="text-[#e8a03c] text-4xl font-bold tracking-widest mb-2" style={{ fontFamily: 'monospace', textShadow: '0 2px 0 #000, 0 0 24px rgba(232,160,60,0.5)' }}>
          SQUEEK WARRIORS
        </div>
        <div className="text-[#d8e8ff] text-xl mb-4" style={{ fontFamily: 'monospace', textShadow: '0 2px 0 #000' }}>
          仓鼠诸葛 · 吞食天地 HD2D
        </div>
        <div className="text-[#ffd15c] text-xs mb-8 bg-black/60 px-3 py-1 rounded border border-amber-500/30" style={{ fontFamily: 'monospace' }}>
          ⚡ 仓鼠跑轮 PoW 实时算力驱动战斗
        </div>
        <div className="text-[#ffe9a8] text-sm animate-pulse mb-2" style={{ fontFamily: 'monospace' }}>
          —— 点 击 进 入 游 戏 ——
        </div>
        <div className="text-[#5a6a8a] text-xs" style={{ fontFamily: 'monospace' }}>
          （点击进入以开启原版 BGM 与音效）
        </div>
      </button>
    );
  }

  return (
    <div
      className="w-full h-full flex items-center justify-center bg-black cursor-pointer"
      onClick={() => {
        // 点击画面任何位置均可触发确认（开始游戏、推进剧情、确认指令）
        const evt = new KeyboardEvent('keydown', { code: 'Enter', bubbles: true, cancelable: true });
        window.dispatchEvent(evt);
      }}
    >
      <canvas
        ref={canvasRef}
        width={VW}
        height={VH}
        style={{
          imageRendering: 'pixelated',
          width: 'min(100vw, calc(100vh * 16 / 9))',
          height: 'min(100vh, calc(100vw * 9 / 16))',
          background: 'transparent',
        }}
      />
    </div>
  );
}
