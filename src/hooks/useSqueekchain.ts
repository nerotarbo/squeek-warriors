import { useState, useEffect } from 'react';

export interface SqueekStatus {
  freshness: string;
  rpm: number;
  coreStatus: 'RUNNING' | 'SLEEPING' | 'OFFLINE';
  cumulativeWork: string;
  observedAt: number;
  isStale: boolean;
}

export interface SqueekEconomy {
  currentRound: string;
  stage: string;
  paused: boolean;
  chainId: string;
}

export function useSqueekchain() {
  const [status, setStatus] = useState<SqueekStatus>({
    freshness: 'online',
    rpm: 0,
    coreStatus: 'SLEEPING',
    cumulativeWork: '0',
    observedAt: Date.now(),
    isStale: false,
  });

  const [economy, setEconomy] = useState<SqueekEconomy>({
    currentRound: '1',
    stage: 'active',
    paused: false,
    chainId: '11155111',
  });

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        // 1. 获取 status 实时状态
        const resStatus = await fetch('https://api.squeekchain.com/v1/status', {
          mode: 'cors',
          headers: { 'Accept': 'application/json' }
        });
        if (resStatus.ok) {
          const data = await resStatus.json();
          if (active && data?.measurement) {
            const m = data.measurement;
            const rpm = typeof m.rpmMilli === 'number' ? m.rpmMilli / 1000 : 0;
            const coreStatus = m.coreStatus === 'RUNNING' && rpm > 0 ? 'RUNNING' : 'SLEEPING';
            setStatus({
              freshness: m.freshness || 'online',
              rpm: Math.round(rpm * 10) / 10,
              coreStatus,
              cumulativeWork: m.cumulativeWorkUnits || '0',
              observedAt: Date.parse(m.observedAt) || Date.now(),
              isStale: m.freshness !== 'online',
            });
            setConnected(true);
          }
        }

        // 2. 获取 economy/state 当前轮次
        const resEco = await fetch('https://api.squeekchain.com/v1/economy/state', {
          mode: 'cors',
          headers: { 'Accept': 'application/json' }
        });
        if (resEco.ok) {
          const ecoData = await resEco.json();
          if (active && ecoData?.status === 'available' && ecoData.lifecycle) {
            setEconomy({
              currentRound: ecoData.lifecycle.currentRound || '1',
              stage: ecoData.lifecycle.stage || 'active',
              paused: !!ecoData.lifecycle.paused,
              chainId: ecoData.chain?.chainId || '11155111',
            });
          }
        }
      } catch (err) {
        console.warn('Squeekchain API live poll error:', err);
      }
    }

    poll();
    const timer = setInterval(poll, 3000); // 3秒刷新一次

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return { status, economy, connected };
}
