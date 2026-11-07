// 角色立绘精灵 —— AI 像素风 PNG（透明底），含正/背面与色相变体
// 加载失败或未就绪时回退到程序化点阵小人
import type { SpritePalette } from './types';

const BASE = import.meta.env.BASE_URL || '/';

export interface SpriteSpec {
  key: string;        // sprites/ 下的文件基名（不含 _front/_back）
  back?: boolean;     // 是否有背面图
  hue?: number;       // 色相旋转（用于一图多将）
  bright?: number;    // 亮度微调
}

// 单位 id → 立绘映射
const SPRITE_MAP: Record<string, SpriteSpec> = {
  zhuge:     { key: 'zhuge', back: true },
  guanyu:    { key: 'guanyu', back: true },
  zhangfei:  { key: 'zhangfei', back: true },
  zhaoyun:   { key: 'zhaoyun', back: true },
  xiahou:    { key: 'xiahou' },
  lidian:    { key: 'lidian' },
  yujin:     { key: 'general', hue: 150 },
  hanhao:    { key: 'general', hue: 40 },
  xiahoulan: { key: 'general', hue: 260 },
  sol1:      { key: 'soldier' },
  sol2:      { key: 'soldier', hue: 25, bright: 0.9 },
};

type ImgState = HTMLImageElement | 'loading' | 'error';
const cache: Record<string, ImgState> = {};

function load(name: string): void {
  if (cache[name]) return;
  cache[name] = 'loading';
  const img = new Image();
  img.onload = () => { cache[name] = img; };
  img.onerror = () => { cache[name] = 'error'; };
  img.src = `${BASE}sprites/${name}.png`;
}

export function preloadSprites(): void {
  for (const spec of Object.values(SPRITE_MAP)) {
    load(`${spec.key}_front`);
    if (spec.back) load(`${spec.key}_back`);
  }
}

function getImg(key: string, view: 'front' | 'back'): HTMLImageElement | null {
  const spec = Object.values(SPRITE_MAP).find((s) => s.key === key);
  const wantBack = view === 'back' && spec?.back;
  const name = `${key}_${wantBack ? 'back' : 'front'}`;
  load(name);
  const v = cache[name];
  return v instanceof HTMLImageElement ? v : null;
}

export interface DrawOpts {
  view?: 'front' | 'back';  // 背面（战斗中我方/向上走）
  flip?: boolean;
  alpha?: number;
  bob?: number;             // 待机/走路起伏相位（秒）
  walkT?: number;           // >0 表示行走中（用于弹跳）
  filter?: string;          // 追加滤镜（如受击闪白 brightness(2.2)）
}

/**
 * 绘制角色立绘。x,y = 角色脚底中心；h = 显示高度（px，480×270 画布坐标）。
 */
export function drawSpriteUnit(
  ctx: CanvasRenderingContext2D,
  unitId: string,
  x: number, y: number,
  h: number,
  opts: DrawOpts = {},
): boolean {
  const spec = SPRITE_MAP[unitId];
  if (!spec) return false;
  const img = getImg(spec.key, opts.view ?? 'front');
  if (!img) return false;

  const { flip = false, alpha = 1, bob = 0, walkT = 0 } = opts;
  const w = h * (img.width / img.height);
  // 待机呼吸 / 行走弹跳
  const bounce = walkT > 0
    ? Math.abs(Math.sin(walkT * 9)) * -2.2
    : Math.sin(bob * 2.2) * -0.8;
  const squash = walkT > 0 ? 1 + Math.sin(walkT * 18) * 0.02 : 1;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  // 色相/亮度变体（一图多将）
  const filters: string[] = [];
  if (spec.hue) filters.push(`hue-rotate(${spec.hue}deg)`);
  if (spec.bright) filters.push(`brightness(${spec.bright})`);
  if (opts.filter) filters.push(opts.filter);
  if (filters.length) ctx.filter = filters.join(' ');
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true; // 512px 高清源：平滑缩放保持立绘干净
  ctx.drawImage(img, -w / 2, -h * squash + bounce, w, h * squash);
  ctx.imageSmoothingEnabled = prev;
  ctx.restore();
  return true;
}

// —— 程序化点阵兜底（原 FC 风小人）——
import type { } from './types';

const BODY = [
  '.....hhhh.....',
  '....hhhhhh....',
  '....hhhhhh....',
  '....ssssss....',
  '....skssks....',
  '....ssssss....',
  '.....ssss.....',
  '...cccccccc...',
  '..tcccccct....',
  '..cccccccc....',
  '..cccccccc....',
  '..cccccccc....',
  '...cccccc.....',
  '...cc..cc.....',
  '...cc..cc.....',
  '...cc..cc.....',
  '..kkk..kkk....',
  '..kkk..kkk....',
];

const HAT_SCHOLAR = [
  '.....kkkk.....',
  '....khhhk.....',
  '....hhhhhh....',
  '....hhhhhh....',
];

const spriteCache = new Map<string, HTMLCanvasElement>();

function pkey(p: SpritePalette, variant: string): string {
  return `${p.skin}|${p.cloth}|${p.trim}|${p.hat}|${variant}`;
}

export function drawUnit(
  ctx: CanvasRenderingContext2D,
  p: SpritePalette,
  variant: 'scholar' | 'warrior',
  x: number, y: number,
  scale = 2,
  flip = false,
  frame = 0,
  alpha = 1,
) {
  const ck = pkey(p, variant + frame);
  let spr = spriteCache.get(ck);
  if (!spr) {
    spr = document.createElement('canvas');
    spr.width = 14; spr.height = 18;
    const c = spr.getContext('2d')!;
    const rows = variant === 'scholar' ? HAT_SCHOLAR.concat(BODY.slice(4)) : BODY;
    for (let ry = 0; ry < 18; ry++) {
      const row = rows[ry] || '';
      for (let rx = 0; rx < 14; rx++) {
        const ch = row[rx];
        let col: string | null = null;
        if (ch === 'h') col = p.hat;
        else if (ch === 's') col = p.skin;
        else if (ch === 'c') col = p.cloth;
        else if (ch === 't') col = p.trim;
        else if (ch === 'k') col = '#181818';
        if (!col) continue;
        c.fillStyle = col;
        c.fillRect(rx, ry, 1, 1);
      }
    }
    if (frame === 1) {
      c.clearRect(0, 16, 14, 2);
      c.fillStyle = '#181818';
      c.fillRect(2, 16, 3, 2); c.fillRect(9, 15, 3, 2);
    }
    spriteCache.set(ck, spr);
  }
  const w = 14 * scale, h = 18 * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = alpha * 0.3;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.36, h * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.drawImage(spr, -w / 2, -h, w, h);
  ctx.restore();
}

export function unitVariant(id: string): 'scholar' | 'warrior' {
  return id === 'zhuge' ? 'scholar' : 'warrior';
}
