// 吞食天地II 诸葛孔明传 HD2D —— 游戏数据（忠于原作设定）
import type { Unit, Stratagem, DialogLine, TileChar } from './types';

export const STRATAGEMS: Record<string, Stratagem> = {
  fire:  { id: 'fire',  name: '烈火计', cost: 10, kind: 'fire',  desc: '以火攻焚烧敌军' },
  water: { id: 'water', name: '洪水计', cost: 8,  kind: 'water', desc: '引水冲垮敌阵' },
  rock:  { id: 'rock',  name: '落石计', cost: 8,  kind: 'rock',  desc: '山上推落巨石' },
  heal:  { id: 'heal',  name: '援助计', cost: 12, kind: 'heal',  desc: '休整部队回复兵力' },
};

const mk = (
  id: string, name: string, title: string, isEnemy: boolean,
  troops: number, sp: number, atk: number, int: number, spd: number,
  palette: Unit['palette'], stratagems: string[] = [],
): Unit => ({
  id, name, title, isEnemy,
  troops, maxTroops: troops, sp, maxSp: sp, atk, int, spd,
  palette, stratagems,
  defending: false, alive: true,
  flashT: 0, shakeT: 0, lungeT: 0, displayTroops: troops,
});

// —— 我方武将（孔明传主角队）——
export const makeParty = (): Unit[] => [
  mk('zhuge', '诸葛亮', '卧龙', false, 3800, 60, 68, 255, 90,
    { skin: '#f0c8a0', cloth: '#e8e4d8', trim: '#3a5a8c', hat: '#2c2c34' },
    ['fire', 'water', 'heal']),
  mk('guanyu', '关羽', '美髯公', false, 4500, 20, 246, 165, 150,
    { skin: '#c8503c', cloth: '#2e6b34', trim: '#d8b13c', hat: '#2e6b34' },
    ['water']),
  mk('zhangfei', '张飞', '万人敌', false, 4600, 0, 250, 90, 130,
    { skin: '#8a5a3c', cloth: '#3c3c44', trim: '#8c2e2e', hat: '#1c1c22' },
    []),
  mk('zhaoyun', '赵云', '常胜将军', false, 4400, 24, 240, 180, 200,
    { skin: '#f0c8a0', cloth: '#c8ccd8', trim: '#4a6ab0', hat: '#c8ccd8' },
    ['rock']),
];

// —— 敌方 ——
export const makeEnemies = (battleId: string): Unit[] => {
  if (battleId === 'scout') {
    return [
      mk('lidian', '李典', '魏将', true, 3200, 10, 175, 140, 110,
        { skin: '#e0b890', cloth: '#4a3a5c', trim: '#8c8c9c', hat: '#3a2c48' }),
      mk('sol1', '曹兵', '先锋', true, 1800, 0, 120, 60, 80,
        { skin: '#e0b890', cloth: '#5c4a3a', trim: '#7a6a5a', hat: '#4a3a2c' }),
      mk('sol2', '曹兵', '先锋', true, 1800, 0, 120, 60, 80,
        { skin: '#e0b890', cloth: '#5c4a3a', trim: '#7a6a5a', hat: '#4a3a2c' }),
    ];
  }
  // 博望坡主力：夏侯惇军
  return [
    mk('xiahou', '夏侯惇', '魏之元勋', true, 7200, 16, 220, 120, 140,
      { skin: '#e0b890', cloth: '#6a2e3c', trim: '#d8b13c', hat: '#2c2430' },
      ['rock']),
    mk('yujin', '于禁', '魏将', true, 4600, 10, 168, 130, 100,
      { skin: '#e0b890', cloth: '#3c4a6a', trim: '#9c9cac', hat: '#2c3448' }),
    mk('hanhao', '韩浩', '魏将', true, 4000, 0, 160, 100, 95,
      { skin: '#d8a880', cloth: '#4a5c3c', trim: '#8c8c7a', hat: '#3c4a30' }),
    mk('xiahoulan', '夏侯兰', '魏将', true, 3800, 8, 155, 95, 90,
      { skin: '#e0b890', cloth: '#5c3c4a', trim: '#ac9c8c', hat: '#48303c' }),
  ];
};

// —— 剧情对话 ——
export const INTRO_DIALOG: DialogLine[] = [
  { speaker: '', text: '建安十二年，Squeekchain 链上算力风起云涌。\n创世仓鼠 Squeektoshi 驱动跑轮，全网算力激增！\n刘备屯驻新野，渴望借仓鼠 PoW 神力一统天下……' },
  { speaker: '刘备', text: '水镜先生有言：\n「得卧龙与仓鼠神机者，可安天下。」\n玄德三顾茅庐，终得见孔明先生！', color: '#7ec8ff' },
  { speaker: '诸葛亮', text: '主公欲成霸业，当引 Squeekchain 链上算力为基石！\n仓鼠奔跑时，全军攻势如雷霆；\n仓鼠歇息时，筑垒固守以待天时——\n此谓「隆中算力对」！', color: '#ffe9a8' },
  { speaker: '刘备', text: '先生之言，如雷贯耳！\n恳请先生出山，执掌 Squeek 创世兵权！', color: '#7ec8ff' },
  { speaker: '诸葛亮', text: '亮虽不才，愿调引全网算力，助主公克敌制胜！', color: '#ffe9a8' },
  { speaker: '', text: '诸葛亮加入队伍！\n全军已接入 Squeekchain 跑轮实时算力加成！' },
  { speaker: '', text: '同年秋——曹操遣夏侯惇都督十万大军犯境。\n诸葛亮引夏侯惇军入博望峡谷，\n借仓鼠跑轮暴击之力，布下火阵！' },
];

export const ENDING_DIALOG: DialogLine[] = [
  { speaker: '夏侯惇', text: '唔……哪来的仓鼠神力！\n火势借 Squeekchain 算力暴涨，烧我十万大军……\n撤！全军撤退！', color: '#ff9a8c' },
  { speaker: '张飞', text: '哈哈！仓鼠转速一飙，俺老张的长矛暴击连连！\n痛快！痛快！', color: '#c8c8c8' },
  { speaker: '关羽', text: '军师神机妙算，引 Squeekchain 实时算力破敌，\n云长佩服！', color: '#a8e0a8' },
  { speaker: '诸葛亮', text: '此战初捷，链上 Round 新周期已启。\n主公，随仓鼠 Squeektoshi 奔赴更广阔的战场吧！', color: '#ffe9a8' },
  { speaker: '', text: '博望坡之战 · 大获全胜！\n创世仓鼠算力战役告捷，成功赢取 $SQK 创世荣誉！' },
];

export const BATTLE_INTRO: Record<string, string> = {
  scout: '李典率领的曹军先锋出现了！\n（Squeekchain 实时跑轮算力已加载）',
  main: '夏侯惇：「诸葛村夫，敢借仓鼠神力与我一战！」\n夏侯惇率领的曹军主力杀到了！',
};

export const VICTORY_MSG: Record<string, string> = {
  scout: '击退了曹军先锋！\n（Squeek 能量回复，全军休整）',
  main: '博望坡大胜！仓鼠算力战役告捷！',
};

// —— 博望坡地图 ——
// G草 T树 R岩壁 W水 B桥 P山道 S花丛
export const MAP_W = 26;
export const MAP_H = 22;
export const FIELD_MAP: TileChar[][] = (
  [
    'RRRRRRRRRRBRRRRRRRRRRRRRRR',
    'RTTTTGTTTPPPPGTTTTTTGTTTTR',
    'RTGGGGGTTTPPPPTTGGGGGGGTTR',
    'RGGTTGGGTTPPPPGGTGTTGGGGGR',
    'RGGTGGGGTTPPPPTGGGGGTGGGGR',
    'RGGTGGGTTTPPPPPTGGGGTGGGGR',
    'RGGGTTTTTPPPPPPTTTTGGGGGGR',
    'RGGGGTTTPPBBBBWPPPGGGGGGGR',
    'RTGGGTTPPWBBBBWWPPPGGGTTGR',
    'RTTGGTPPWWBBBBWWWWPPTGGTTR',
    'RTTGGPPPWWBBBBWWPPPTGGGGGR',
    'RTGGGPPTWWBBBBWWPPTGGGGGGR',
    'RGGGGPPTTWBBBBPPPTTTGGGGGR',
    'RGGGGPPPTTTTPPPTTTTGGGGGGR',
    'RTGGGGPPPPPPPPPTTGGTGGGGGR',
    'RTTGGGGTPPPPPGGGGGTTGGGGGR',
    'RTTTGGGGTPPPGGGGTTTTTGGGGR',
    'RTGTTGGGGPPPGGGGGGTTGGSGGR',
    'RGGGGGTTTPPPTTTGGGGGGGSSGR',
    'RGGGGGGGGPPPGGGGGGGGGGGGGR',
    'RGGSGGGGGGPPGGGGGSGGGGGGGR',
    'RRRRRRRRRRPPRRRRRRRRRRRRRR',
  ] as const
).map((r) => r.split('') as TileChar[]);

// 触发点：走到北桥即遇先锋，走到最北触发夏侯惇主力
export const START_POS = { x: 10, y: 20 };
export const SCOUT_TRIGGER = { x: 11, y: 10 };
export const MAIN_TRIGGER = { x: 10, y: 1 };
