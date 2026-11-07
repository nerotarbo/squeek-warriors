// 回合制战斗系统 —— 仿吞食天地2：兵力、计策、防御、撤退
import type { BattleState, Unit, Action } from './types';
import { makeEnemies, STRATAGEMS } from './data';
import { drawUnit, unitVariant, drawSpriteUnit } from './sprites';
import { ParticleSystem, emitFire, emitHit, VW, VH, drawVignette, drawGlowPulse, drawMistBands, emitFallen } from './effects';
import { sfx } from './sfx';
import { drawBgCover } from './bg';
import { squeekGlobal } from './squeekBridge';

export interface Floater { x: number; y: number; text: string; color: string; t: number }
let floaters: Floater[] = [];

const COMMANDS = ['攻击', '计策', '防御', '撤退'];

export function createBattle(battleId: string, party: Unit[]): BattleState {
  floaters = [];
  const allies = party.map((u) => ({ ...u, defending: false, alive: u.troops > 0, flashT: 0, shakeT: 0, lungeT: 0 }));
  return {
    allies,
    enemies: makeEnemies(battleId),
    phase: 'intro',
    menuIdx: 0, subIdx: 0, targetIdx: 0, actorIdx: 0,
    round: 1, queue: [],
    msg: '', msgT: 0,
    battleId,
    fireLevel: battleId === 'main' ? 1 : 0,
    shake: 0, turn: 0, fled: false,
  };
}

function aliveEnemies(s: BattleState) { return s.enemies.filter((e) => e.alive); }
function aliveAllies(s: BattleState) { return s.allies.filter((a) => a.alive); }

function setMsg(s: BattleState, msg: string, dur = 1.2) {
  s.msg = msg; s.msgT = dur;
}

// —— 伤害公式（兵力越足伤害越高，结合 Squeekchain 实时算力加成）——
function physDamage(att: Unit, def: Unit): number {
  const ratio = 0.5 + 0.5 * (att.troops / att.maxTroops);
  const rand = 0.85 + Math.random() * 0.3;
  let d = att.atk * 3.2 * ratio * rand;

  // 玩家阵营受 Squeekchain 仓鼠实时运转加成
  if (!att.isEnemy && squeekGlobal.atkMultiplier > 1.0) {
    d *= squeekGlobal.atkMultiplier;
  }

  // 暴击判定
  const isCrit = !att.isEnemy && Math.random() < squeekGlobal.critChance;
  if (isCrit) {
    d *= 1.5;
  }

  if (def.defending) d *= 0.45;
  return Math.max(1, Math.round(d));
}

function stratDamage(att: Unit, def: Unit, kind: string, s: BattleState): number {
  const rand = 0.85 + Math.random() * 0.3;
  let base = att.int * (kind === 'fire' ? 5.2 : 3.6) * rand;
  if (kind === 'fire' && s.battleId === 'main') base *= 1 + s.fireLevel * 0.25; // 博望坡火势加成

  // 玩家阵营受 Squeekchain 实时算力加成
  if (!att.isEnemy && squeekGlobal.atkMultiplier > 1.0) {
    base *= squeekGlobal.atkMultiplier;
  }

  if (def.defending) base *= 0.6;
  return Math.max(1, Math.round(base));
}

function applyDamage(s: BattleState, target: Unit, dmg: number, ps: ParticleSystem, color = '#ffe9a8') {
  target.troops = Math.max(0, target.troops - dmg);
  target.flashT = 0.35;
  target.shakeT = 0.3;
  s.shake = Math.min(6, s.shake + 3);
  const p = unitPos(s, target);
  floaters.push({ x: p.x, y: p.y - 46, text: `-${dmg}`, color, t: 0 });
  emitHit(ps, p.x, p.y - 18, color);
  if (target.troops <= 0 && target.alive) {
    target.alive = false;
    sfx.dead();
    floaters.push({ x: p.x, y: p.y - 60, text: '溃散!', color: '#ff6a5a', t: 0 });
  }
}

function applyHeal(s: BattleState, target: Unit, amt: number, ps: ParticleSystem) {
  target.troops = Math.min(target.maxTroops, target.troops + amt);
  const p = unitPos(s, target);
  floaters.push({ x: p.x, y: p.y - 46, text: `+${amt}`, color: '#7ae08c', t: 0 });
  emitHit(ps, p.x, p.y - 18, '#7ae08c');
}

export function unitPos(s: BattleState, u: Unit): { x: number; y: number } {
  const list = u.isEnemy ? s.enemies : s.allies;
  const i = list.indexOf(u);
  if (u.isEnemy) {
    const n = list.length;
    const spread = Math.min(64, 300 / Math.max(1, n - 1 || 1));
    const x0 = VW / 2 - ((n - 1) * spread) / 2;
    return { x: x0 + i * spread, y: 88 };
  }
  const n = list.length;
  const spread = Math.min(76, 320 / Math.max(1, n - 1 || 1));
  const x0 = VW / 2 - ((n - 1) * spread) / 2;
  return { x: x0 + i * spread, y: 186 };
}

// —— 输入 ——
// 返回 'done' 表示战斗结束（胜利/败北/逃跑后的收尾由 Game 判断 phase）
export function battleInput(s: BattleState, key: string, _ps: ParticleSystem): void {
  const actor = s.allies[s.actorIdx];

  if (s.phase === 'intro') {
    if (key === 'confirm') { sfx.confirm(); s.phase = 'menu'; s.menuIdx = 0; }
    return;
  }
  if (s.phase === 'victory' || s.phase === 'defeat' || s.phase === 'flee') {
    if (key === 'confirm') s.msgT = 0; // 通知 Game 层收尾
    return;
  }
  if (s.phase === 'execute' || s.phase === 'message') return;

  if (s.phase === 'menu') {
    if (key === 'up') { s.menuIdx = (s.menuIdx + COMMANDS.length - 1) % COMMANDS.length; sfx.cursor(); }
    else if (key === 'down') { s.menuIdx = (s.menuIdx + 1) % COMMANDS.length; sfx.cursor(); }
    else if (key === 'confirm') {
      const cmd = COMMANDS[s.menuIdx];
      if (cmd === '计策' && actor.stratagems.length === 0) { sfx.cancel(); setMsg(s, `${actor.name}没有可使用的计策！`, 1.0); return; }
      if (cmd === '计策') {
        const usable = actor.stratagems.filter((id) => STRATAGEMS[id].cost <= actor.sp);
        if (usable.length === 0) { sfx.cancel(); setMsg(s, '策略点不足！', 1.0); return; }
        sfx.confirm(); s.phase = 'submenu'; s.subIdx = 0; return;
      }
      sfx.confirm();
      if (cmd === '攻击') { s.phase = 'target'; s.targetIdx = firstAliveIndex(s.enemies); s.queue.push({ actor, kind: 'attack' }); }
      else if (cmd === '防御') { pushAction(s, { actor, kind: 'defend' }); }
      else if (cmd === '撤退') { pushAction(s, { actor, kind: 'flee' }); }
    }
    return;
  }

  if (s.phase === 'submenu') {
    const usable = actor.stratagems.filter((id) => STRATAGEMS[id].cost <= actor.sp);
    if (key === 'up') { s.subIdx = (s.subIdx + usable.length - 1) % usable.length; sfx.cursor(); }
    else if (key === 'down') { s.subIdx = (s.subIdx + 1) % usable.length; sfx.cursor(); }
    else if (key === 'cancel') { sfx.cancel(); s.phase = 'menu'; }
    else if (key === 'confirm') {
      const st = STRATAGEMS[usable[s.subIdx]];
      sfx.confirm();
      s.queue.push({ actor, kind: 'stratagem', stratagem: st });
      if (st.kind === 'heal') { s.phase = 'target'; s.targetIdx = firstAliveIndex(s.allies); }
      else { s.phase = 'target'; s.targetIdx = firstAliveIndex(s.enemies); }
    }
    return;
  }

  if (s.phase === 'target') {
    const lastAction = s.queue[s.queue.length - 1];
    const isHeal = lastAction?.stratagem?.kind === 'heal';
    const pool = isHeal ? s.allies : s.enemies;
    if (key === 'left' || key === 'right') {
      const dir = key === 'left' ? -1 : 1;
      let i = s.targetIdx;
      for (let k = 0; k < pool.length; k++) {
        i = (i + dir + pool.length) % pool.length;
        if (pool[i].alive) break;
      }
      s.targetIdx = i; sfx.cursor();
    } else if (key === 'cancel') {
      sfx.cancel(); s.queue.pop();
      s.phase = lastAction?.kind === 'stratagem' ? 'submenu' : 'menu';
    } else if (key === 'confirm') {
      sfx.confirm();
      if (lastAction) lastAction.target = pool[s.targetIdx];
      pushAction(s, lastAction, true);
    }
  }
}

function firstAliveIndex(list: Unit[]): number {
  const i = list.findIndex((u) => u.alive);
  return i < 0 ? 0 : i;
}

// alreadyQueued: 攻击/计策已入队（等待目标），防御/撤退直接入队
function pushAction(s: BattleState, act: Action, alreadyQueued = false) {
  if (!alreadyQueued) s.queue.push(act);
  if (act.kind === 'defend') { act.actor.defending = true; setMsg(s, `${act.actor.name}摆出了防御姿态`, 0.6); }
  // 下一个行动者
  let next = s.actorIdx + 1;
  while (next < s.allies.length && !s.allies[next].alive) next++;
  if (next < s.allies.length) {
    s.actorIdx = next; s.menuIdx = 0; s.phase = 'menu';
  } else {
    buildEnemyActions(s);
    s.queue.sort((a, b) => (b.actor.spd * (0.8 + Math.random() * 0.4)) - (a.actor.spd * (0.8 + Math.random() * 0.4)));
    s.phase = 'execute'; s.turn = -1; s.msgT = 0.4; s.msg = '';
  }
}

function buildEnemyActions(s: BattleState) {
  for (const e of aliveEnemies(s)) {
    const targets = aliveAllies(s);
    if (targets.length === 0) break;
    // 简单 AI：偶尔用计策
    if (e.stratagems.length > 0 && e.sp >= STRATAGEMS[e.stratagems[0]].cost && Math.random() < 0.3) {
      const st = STRATAGEMS[e.stratagems[0]];
      e.sp -= st.cost;
      s.queue.push({ actor: e, kind: 'stratagem', stratagem: st, target: targets[(Math.random() * targets.length) | 0] });
    } else {
      s.queue.push({ actor: e, kind: 'attack', target: targets[(Math.random() * targets.length) | 0] });
    }
  }
}

// —— 帧更新（动画与执行推进）——
export function updateBattle(s: BattleState, dt: number, ps: ParticleSystem): void {
  for (const u of [...s.allies, ...s.enemies]) {
    if (u.flashT > 0) u.flashT -= dt;
    if (u.shakeT > 0) u.shakeT -= dt;
    if (u.lungeT > 0) u.lungeT -= dt;
    // 兵力数字滚动
    const diff = u.troops - u.displayTroops;
    if (diff !== 0) {
      const step = Math.max(20, Math.abs(diff) * 8) * dt;
      u.displayTroops += Math.sign(diff) * Math.min(Math.abs(diff), step);
      if (Math.abs(u.displayTroops - u.troops) < 1) u.displayTroops = u.troops;
    }
  }
  floaters.forEach((f) => { f.t += dt; f.y -= 22 * dt; });
  floaters = floaters.filter((f) => f.t < 1);
  if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 14);

  // 博望坡环境火焰
  if (s.fireLevel > 0) {
    for (let i = 0; i < s.fireLevel; i++) {
      emitFire(ps, 40 + Math.random() * (VW - 80), 150 + Math.random() * 30, 1);
    }
  }

  if (s.phase === 'message') {
    s.msgT -= dt;
    if (s.msgT <= 0) { s.msg = ''; s.phase = 'menu'; s.menuIdx = 0; }
    return;
  }
  if (s.phase !== 'execute') return;
  if (s.msgT > 0) { s.msgT -= dt; return; }

  // 推进队列
  s.turn++;
  while (s.turn < s.queue.length && !s.queue[s.turn].actor.alive) s.turn++;

  if (s.turn >= s.queue.length) {
    // 回合结束
    s.round++;
    s.queue = [];
    s.allies.forEach((a) => { a.defending = false; });
    s.enemies.forEach((a) => { a.defending = false; });
    if (checkEnd(s)) return;
    s.actorIdx = firstAliveIndex(s.allies);
    s.phase = 'menu'; s.menuIdx = 0;
    setMsg(s, `—— 第 ${s.round} 回合 ——`, 0.8);
    s.phase = 'message';
    return;
  }

  const act = s.queue[s.turn];
  const actor = act.actor;

  if (act.kind === 'defend') { setMsg(s, `${actor.name}坚守阵地`, 0.55); return; }

  if (act.kind === 'flee') {
    if (Math.random() < 0.55) {
      s.fled = true; s.phase = 'flee';
      setMsg(s, `${actor.name}：全军撤退！\n脱离了战场……`, 1.4);
      sfx.flee();
    } else {
      setMsg(s, '撤退失败！被敌军缠住了！', 1.0);
    }
    return;
  }

  const target = act.target && act.target.alive ? act.target : defaultTarget(s, actor);
  if (!target) { checkEnd(s); return; }

  actor.lungeT = 0.3;

  if (act.kind === 'attack') {
    const dmg = physDamage(actor, target);
    applyDamage(s, target, dmg, ps);
    setMsg(s, `${actor.name}攻击${target.name}！\n${target.name}军损失 ${dmg} 人！`, 1.0);
    sfx.hit();
  } else if (act.kind === 'stratagem' && act.stratagem) {
    const st = act.stratagem;
    if (st.kind === 'heal') {
      const amt = Math.round(actor.int * 3 * (0.9 + Math.random() * 0.2));
      applyHeal(s, target, amt, ps);
      setMsg(s, `${actor.name}施展「${st.name}」！\n${target.name}军回复 ${amt} 人！`, 1.1);
      sfx.heal();
    } else {
      const dmg = stratDamage(actor, target, st.kind, s);
      const col = st.kind === 'fire' ? '#ff9a3c' : st.kind === 'water' ? '#6ab8ff' : '#c8b090';
      if (st.kind === 'fire') {
        const p = unitPos(s, target);
        emitFire(ps, p.x, p.y, 24);
        if (s.battleId === 'main') s.fireLevel = Math.min(3, s.fireLevel + 1);
        sfx.fire(); s.shake = 8;
      } else { sfx.bigHit(); }
      applyDamage(s, target, dmg, ps, col);
      setMsg(s, `${actor.name}施展「${st.name}」！\n${target.name}军损失 ${dmg} 人！`, 1.15);
    }
  }
  checkEnd(s);
}

function defaultTarget(s: BattleState, actor: Unit): Unit | undefined {
  const pool = actor.isEnemy ? aliveAllies(s) : aliveEnemies(s);
  return pool[(Math.random() * pool.length) | 0];
}

function checkEnd(s: BattleState): boolean {
  if (aliveEnemies(s).length === 0) {
    s.phase = 'victory';
    setMsg(s, '敌军全军覆没！\n我军大获全胜！', 1.5);
    sfx.victory();
    return true;
  }
  if (aliveAllies(s).length === 0) {
    s.phase = 'defeat';
    setMsg(s, '我军全军覆没……\n苍天已死，黄天……不，还没结束！', 1.5);
    sfx.defeat();
    return true;
  }
  return false;
}

// —— 绘制 ——
export function drawBattle(ctx: CanvasRenderingContext2D, s: BattleState, ps: ParticleSystem, time: number) {
  const main = s.battleId === 'main';
  // 运镜：开场推近、出招瞬间前压、平时呼吸
  let camScale = 1.03;
  if (s.phase === 'intro') camScale = 1.12;
  else if (s.phase === 'execute') camScale = 1.07;
  else camScale = 1.03 + 0.012 * Math.sin(time * 0.5);
  const focusX = s.phase === 'execute' ? 0.5 + Math.sin(time * 2) * 0.02 : 0.5;
  const bgId = main ? 'battle_main' : 'field';
  const fy = main ? 0.55 : 0.72;

  const shx = s.shake > 0 ? (Math.random() - 0.5) * s.shake : 0;
  const shy = s.shake > 0 ? (Math.random() - 0.5) * s.shake : 0;
  ctx.save();
  ctx.translate(shx, shy);

  // 背景：火海博望坡（主力战）/ 黄昏峡谷（先锋战）
  if (!drawBgCover(ctx, bgId, 0, 0, VW, VH, camScale, focusX, fy)) {
    const sky = ctx.createLinearGradient(0, 0, 0, VH);
    if (main) {
      sky.addColorStop(0, '#2e1a2c'); sky.addColorStop(0.45, '#7a3020');
      sky.addColorStop(0.75, '#c86a2e'); sky.addColorStop(1, '#e8a04a');
    } else {
      sky.addColorStop(0, '#2c3a5c'); sky.addColorStop(0.55, '#b0763c'); sky.addColorStop(1, '#e0aa5a');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VW, VH);
  }

  // 动态氛围：火光呼吸 / 晨雾流动
  if (main) {
    drawGlowPulse(ctx, time, [
      { x: 70, y: 90, r: 150, color: 'rgba(255,120,40,ALPHA)' },
      { x: 400, y: 80, r: 170, color: 'rgba(255,90,30,ALPHA)' },
      { x: 240, y: 40, r: 200, color: 'rgba(255,140,50,ALPHA)' },
    ]);
    drawMistBands(ctx, time * 1.6, 60, 'rgba(60,30,30,ALPHA)', 0.16);
    emitFallen(ps, 'ember');
  } else {
    drawGlowPulse(ctx, time, [{ x: 300, y: 70, r: 220, color: 'rgba(255,200,120,ALPHA)' }]);
    drawMistBands(ctx, time, 120, 'rgba(255,214,170,ALPHA)', 0.08);
  }

  // 底部压暗，让单位与 UI 更突出
  const floorShade = ctx.createLinearGradient(0, 110, 0, VH);
  floorShade.addColorStop(0, 'rgba(8,6,12,0)');
  floorShade.addColorStop(0.55, 'rgba(8,6,12,0.18)');
  floorShade.addColorStop(1, 'rgba(8,6,12,0.55)');
  ctx.fillStyle = floorShade;
  ctx.fillRect(0, 110, VW, VH - 110);

  // 粒子（火焰/烟）
  ps.draw(ctx);

  // 敌方（上排）
  s.enemies.forEach((u, i) => {
    const p = unitPos(s, u);
    drawBattleUnit(ctx, s, u, p.x, p.y + Math.sin(time * 2 + i) * 1.5, true);
  });
  // 我方（下排）
  s.allies.forEach((u, i) => {
    const p = unitPos(s, u);
    drawBattleUnit(ctx, s, u, p.x, p.y + Math.sin(time * 2 + i * 1.3) * 1.5, false);
  });
  ctx.restore();

  // 浮动伤害数字
  ctx.textAlign = 'center';
  floaters.forEach((f) => {
    ctx.globalAlpha = Math.max(0, 1 - f.t);
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#000';
    ctx.fillText(f.text, f.x + 1, f.y + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  });
  ctx.globalAlpha = 1;

  drawVignette(ctx, s.battleId === 'main' ? 'warm' : 'cool');

  // UI
  drawStatusBar(ctx, s);
  if (s.phase === 'menu' || s.phase === 'submenu' || s.phase === 'target') drawCommandUI(ctx, s);
  if (s.msg) drawMessage(ctx, s.msg);
  if (s.phase === 'intro') drawMessage(ctx, '');

  // 战斗界面顶部常驻仓鼠跑轮实时加成横条
  ctx.fillStyle = 'rgba(11,19,22,0.85)';
  ctx.fillRect(VW / 2 - 120, 4, 240, 20);
  ctx.strokeStyle = squeekGlobal.coreStatus === 'RUNNING' ? '#4ade80' : '#e8a03c';
  ctx.lineWidth = 1;
  ctx.strokeRect(VW / 2 - 119.5, 4.5, 239, 19);

  ctx.textAlign = 'center';
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = squeekGlobal.coreStatus === 'RUNNING' ? '#4ade80' : '#ffd15c';
  ctx.fillText(
    `🐹 仓鼠Squeektoshi: ${squeekGlobal.coreStatus} (${squeekGlobal.rpm} RPM) | 战力: +${Math.round((squeekGlobal.atkMultiplier - 1) * 100)}%`,
    VW / 2,
    17
  );
}

function drawBattleUnit(ctx: CanvasRenderingContext2D, s: BattleState, u: Unit, x: number, y: number, isEnemy: boolean) {
  // 立绘高度：夏侯惇（Boss）更大，我方略大于敌兵
  const h = u.id === 'xiahou' ? 72 : isEnemy ? 56 : 60;
  const view = isEnemy ? 'front' : 'back';
  let dx = 0;
  if (u.shakeT > 0) dx = (Math.random() - 0.5) * 4;
  const lunge = u.lungeT > 0 ? Math.sin((0.3 - u.lungeT) / 0.3 * Math.PI) * (isEnemy ? 12 : -12) : 0;

  // 地面投影
  ctx.fillStyle = 'rgba(8,5,3,0.4)';
  ctx.beginPath();
  ctx.ellipse(x + dx, y + 4, h * 0.3, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 闪白 / 暖色轮廓光
  ctx.save();
  ctx.shadowColor = s.battleId === 'main' ? 'rgba(255,150,60,0.6)' : 'rgba(255,206,130,0.5)';
  ctx.shadowBlur = 8;
  const ok = drawSpriteUnit(ctx, u.id, x + dx, y + lunge, h, {
    view,
    alpha: u.alive ? 1 : 0.25,
    bob: u.alive ? performance.now() * 0.001 + x * 0.05 : 0,
    filter: u.flashT > 0 ? 'brightness(2.2)' : undefined,
  });
  ctx.restore();
  if (!ok) {
    ctx.save();
    if (u.flashT > 0) ctx.filter = 'brightness(2.2)';
    drawUnit(ctx, u.palette, unitVariant(u.id), x + dx, y + lunge, 2, isEnemy, 0, u.alive ? 1 : 0.25);
    ctx.restore();
  }

  // 兵力数字
  ctx.textAlign = 'center';
  ctx.font = 'bold 9px monospace';
  const ty = isEnemy ? y + 14 : y - h - 6;
  ctx.fillStyle = '#000';
  ctx.fillText(`${Math.round(u.displayTroops)}`, x + 1, ty + 1);
  ctx.fillStyle = u.troops / u.maxTroops < 0.3 ? '#ff7a5a' : '#fff';
  ctx.fillText(`${Math.round(u.displayTroops)}`, x, ty);

  // 目标光标
  if (s.phase === 'target') {
    const lastAction = s.queue[s.queue.length - 1];
    const isHeal = lastAction?.stratagem?.kind === 'heal';
    const pool = isHeal ? s.allies : s.enemies;
    if (pool[s.targetIdx] === u) {
      ctx.fillStyle = '#ffe94a';
      ctx.font = '10px monospace';
      ctx.fillText('▼', x, y - h - 12 + Math.sin(performance.now() * 0.008) * 2);
    }
  }
}

function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = 'rgba(10,14,40,0.88)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#e8e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.strokeStyle = '#5a6ac8';
  ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
}

function drawStatusBar(ctx: CanvasRenderingContext2D, s: BattleState) {
  drawWindow(ctx, 4, VH - 66, 150, 62);
  ctx.textAlign = 'left';
  ctx.font = '9px monospace';
  s.allies.forEach((u, i) => {
    const y = VH - 54 + i * 13;
    ctx.fillStyle = u.alive ? '#ffe9a8' : '#6a6a6a';
    ctx.fillText(u.name, 10, y);
    ctx.fillStyle = u.alive ? '#fff' : '#5a5a5a';
    ctx.fillText(`${Math.round(u.displayTroops)}`, 52, y);
    ctx.fillStyle = '#7ec8ff';
    ctx.fillText(`SP${u.sp}`, 108, y);
  });
  // 当前行动者指示
  if (s.phase === 'menu' || s.phase === 'submenu' || s.phase === 'target') {
    const a = s.allies[s.actorIdx];
    if (a?.alive) {
      ctx.fillStyle = '#ffe94a';
      ctx.fillText('▶', 2 + 0, VH - 54 + s.actorIdx * 13 - 0);
      void a;
    }
  }
}

function drawCommandUI(ctx: CanvasRenderingContext2D, s: BattleState) {
  const actor = s.allies[s.actorIdx];
  if (!actor) return;
  drawWindow(ctx, VW - 118, VH - 96, 112, 92);
  ctx.textAlign = 'left';
  ctx.font = '10px monospace';
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText(actor.name, VW - 108, VH - 82);
  COMMANDS.forEach((c, i) => {
    const y = VH - 66 + i * 14;
    const disabled = c === '计策' && actor.stratagems.length === 0;
    ctx.fillStyle = disabled ? '#5a5a5a' : i === s.menuIdx ? '#ffe94a' : '#e8e8f0';
    ctx.fillText(`${i === s.menuIdx ? '▶' : ' '}${c}`, VW - 106, y);
  });

  if (s.phase === 'submenu') {
    const usable = actor.stratagems.filter((id) => STRATAGEMS[id].cost <= actor.sp);
    drawWindow(ctx, VW - 224, VH - 96, 100, 24 + usable.length * 14);
    usable.forEach((id, i) => {
      const st = STRATAGEMS[id];
      const y = VH - 82 + i * 14;
      ctx.fillStyle = i === s.subIdx ? '#ffe94a' : '#e8e8f0';
      ctx.font = '9px monospace';
      ctx.fillText(`${i === s.subIdx ? '▶' : ' '}${st.name}`, VW - 216, y);
      ctx.fillStyle = '#7ec8ff';
      ctx.fillText(`${st.cost}`, VW - 148, y);
    });
  }
}

function drawMessage(ctx: CanvasRenderingContext2D, msg: string) {
  if (!msg) return;
  drawWindow(ctx, 60, 8, VW - 120, 42);
  ctx.textAlign = 'left';
  ctx.font = '10px monospace';
  ctx.fillStyle = '#fff';
  const lines = msg.split('\n');
  lines.forEach((ln, i) => ctx.fillText(ln, 70, 26 + i * 13));
}
