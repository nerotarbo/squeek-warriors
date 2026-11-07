// HD2D 场景背景图 —— 预加载 + cover 绘制
const BASE = import.meta.env.BASE_URL || '/';
const cache: Record<string, HTMLImageElement | 'loading' | 'error'> = {};

export function preloadBg(id: string): void {
  if (cache[id]) return;
  cache[id] = 'loading';
  const img = new Image();
  img.onload = () => { cache[id] = img; };
  img.onerror = () => { cache[id] = 'error'; };
  img.src = `${BASE}bg/${id}.jpg`;
}

export function bgReady(id: string): boolean {
  return cache[id] instanceof HTMLImageElement;
}

export function getBg(id: string): HTMLImageElement | null {
  const v = cache[id];
  return v instanceof HTMLImageElement ? v : null;
}

/**
 * 以 cover 方式把背景图画进 (x, y, w, h)。
 * scale > 1 表示推近（Ken Burns 用），fx/fy 为取景焦点 (0~1)。
 * 返回 false 表示图片尚未加载（调用方画兜底背景）。
 */
export function drawBgCover(
  ctx: CanvasRenderingContext2D,
  id: string,
  x: number, y: number, w: number, h: number,
  scale = 1, fx = 0.5, fy = 0.5,
): boolean {
  const v = cache[id];
  if (!(v instanceof HTMLImageElement)) return false;
  const img = v;
  const ir = img.width / img.height;
  const tr = w / h;
  let sw: number, sh: number;
  if (ir > tr) { sh = img.height; sw = sh * tr; } else { sw = img.width; sh = sw / tr; }
  sw /= scale; sh /= scale;
  const sx = Math.max(0, Math.min(img.width - sw, (img.width - sw) * fx));
  const sy = Math.max(0, Math.min(img.height - sh, (img.height - sh) * fy));
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true; // 大图缩小时用平滑采样
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.imageSmoothingEnabled = prev;
  return true;
}
