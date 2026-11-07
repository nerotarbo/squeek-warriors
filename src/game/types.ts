// 吞食天地II 诸葛孔明传 HD2D —— 类型定义

export interface Stats {
  troops: number;      // 当前兵力 (HP)
  maxTroops: number;   // 最大兵力
  sp: number;          // 策略点 (MP)
  maxSp: number;
  atk: number;         // 武力
  int: number;         // 智力
  spd: number;         // 速度
}

export interface Stratagem {
  id: string;
  name: string;
  cost: number;
  kind: 'fire' | 'water' | 'rock' | 'heal';
  desc: string;
}

export interface Unit extends Stats {
  id: string;
  name: string;
  title: string;       // 称号
  palette: SpritePalette;
  stratagems: string[]; // Stratagem id
  isEnemy: boolean;
  defending: boolean;
  alive: boolean;
  // 战斗动画状态
  flashT: number;      // 受击闪白计时
  shakeT: number;      // 震动计时
  lungeT: number;      // 攻击前冲计时
  displayTroops: number; // 数字滚动显示
}

export interface SpritePalette {
  skin: string;
  cloth: string;
  trim: string;
  hat: string;
}

export type TileChar = 'G' | 'T' | 'R' | 'W' | 'B' | 'P' | 'S';

export type SceneId =
  | 'title'
  | 'intro'        // 三顾茅庐剧情
  | 'field'        // 地图探索
  | 'battle'       // 战斗
  | 'ending'       // 结尾
  | 'demoend';

export interface DialogLine {
  speaker: string;
  text: string;
  color?: string;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: string;
  kind: 'dust' | 'fire' | 'smoke' | 'spark' | 'ember';
}

export interface BattleState {
  allies: Unit[];
  enemies: Unit[];
  phase: 'intro' | 'menu' | 'submenu' | 'target' | 'execute' | 'message' | 'victory' | 'defeat' | 'flee';
  menuIdx: number;
  subIdx: number;
  targetIdx: number;
  actorIdx: number;          // 当前下指令的我方索引
  round: number;
  queue: Action[];
  msg: string;
  msgT: number;
  battleId: string;
  fireLevel: number;         // 博望坡火势 0~3
  shake: number;
  turn: number;              // 执行队列光标
  fled: boolean;
}

export interface Action {
  actor: Unit;
  kind: 'attack' | 'stratagem' | 'defend' | 'flee';
  target?: Unit;
  stratagem?: Stratagem;
}
