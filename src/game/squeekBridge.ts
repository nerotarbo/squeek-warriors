// 全局 Squeekchain 实时生态状态缓存
export interface SqueekGlobalState {
  rpm: number;
  coreStatus: 'RUNNING' | 'SLEEPING' | 'OFFLINE';
  currentRound: string;
  workUnits: string;
  connected: boolean;
  atkMultiplier: number; // 跑轮运转加成 1.0 ~ 1.5
  critChance: number;   // 暴击率 0.1 ~ 0.35
}

export const squeekGlobal: SqueekGlobalState = {
  rpm: 0,
  coreStatus: 'SLEEPING',
  currentRound: '1',
  workUnits: '0',
  connected: false,
  atkMultiplier: 1.0,
  critChance: 0.1,
};

export function updateSqueekGlobal(
  rpm: number,
  status: 'RUNNING' | 'SLEEPING' | 'OFFLINE',
  round: string,
  workUnits: string
) {
  squeekGlobal.rpm = rpm;
  squeekGlobal.coreStatus = status;
  squeekGlobal.currentRound = round;
  squeekGlobal.workUnits = workUnits;
  squeekGlobal.connected = true;

  if (status === 'RUNNING' && rpm > 0) {
    // 仓鼠狂奔，战斗攻击力提升 20%~50%，暴击率大幅增加
    const bonus = Math.min(0.5, (rpm / 100) * 0.3);
    squeekGlobal.atkMultiplier = 1.2 + bonus;
    squeekGlobal.critChance = 0.25;
  } else {
    // 仓鼠休眠，恢复标准基准
    squeekGlobal.atkMultiplier = 1.0;
    squeekGlobal.critChance = 0.1;
  }
}
