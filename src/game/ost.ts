// 原版 BGM 曲目表 —— 本地 MP3 文件，打进游戏包，100% 可发声
export interface OstTrack {
  name: string;
  source: string;
  loop: boolean;
  file: string;
}

export const OST: Record<string, OstTrack> = {
  title:   { name: '吞食天地Ⅱ · Title',            source: '原版FC音源', loop: true,  file: 'title.mp3' },
  intro:   { name: '吞食天地Ⅱ · 草庐 Hermitage',   source: '原版FC音源', loop: true,  file: 'intro.mp3' },
  field:   { name: '重装机兵 · 未知荒野',          source: '原版FC音源', loop: true,  file: 'field.mp3' },
  battle:  { name: '重装机兵 · WANTED! 赏金首战',  source: '原版FC音源', loop: true,  file: 'battle.mp3' },
  main:    { name: '吞食天地Ⅱ · 攻城战 Siege',     source: '原版FC音源', loop: true,  file: 'main.mp3' },
  victory: { name: '吞食天地Ⅱ · Victory',          source: '原版FC音源', loop: false, file: 'victory.mp3' },
  ending:  { name: '吞食天地Ⅱ · Ending',           source: '原版FC音源', loop: true,  file: 'ending.mp3' },
  demoend: { name: '重装机兵 · 忘不了的人',        source: '原版FC音源', loop: true,  file: 'demoend.mp3' },
};

export function emitOst(id: string | null) {
  window.dispatchEvent(new CustomEvent('game-ost', { detail: id }));
}

export function toggleOst() {
  window.dispatchEvent(new CustomEvent('game-ost-toggle'));
}

export function ostUrl(id: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}music/${OST[id]?.file ?? ''}`;
}
