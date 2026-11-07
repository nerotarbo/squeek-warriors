import React, { useState } from 'react';
import { useSqueekchain } from '../hooks/useSqueekchain';
import { updateSqueekGlobal } from '../game/squeekBridge';

export default function SqueekHUD() {
  const { status, economy, connected } = useSqueekchain();
  const [minimized, setMinimized] = useState(false);

  // 同步到游戏引擎全局
  React.useEffect(() => {
    updateSqueekGlobal(
      status.rpm,
      status.coreStatus,
      economy.currentRound,
      status.cumulativeWork
    );
  }, [status, economy]);

  const isRunning = status.coreStatus === 'RUNNING';

  return (
    <div className="absolute top-2 left-2 z-40 font-mono select-none pointer-events-auto">
      {minimized ? (
        <button
          onClick={() => setMinimized(false)}
          className="bg-black/80 hover:bg-black text-amber-400 border border-amber-500/50 px-3 py-1.5 rounded text-xs flex items-center gap-2 backdrop-blur-md shadow-lg transition-all"
        >
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-ping' : 'bg-amber-400'}`} />
          <span>🐹 Squeekchain · {isRunning ? `${status.rpm} RPM` : 'SLEEPING'}</span>
        </button>
      ) : (
        <div className="bg-[#0b1316]/90 border border-amber-500/40 rounded-lg p-3 text-white backdrop-blur-md shadow-2xl w-72 text-xs transition-all">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🐹</span>
              <div>
                <div className="font-bold text-amber-400 tracking-wider">SQUEEKCHAIN LIVE</div>
                <div className="text-[10px] text-gray-400">Hamster PoW Realtime Engine</div>
              </div>
            </div>
            <button
              onClick={() => setMinimized(true)}
              className="text-gray-400 hover:text-white px-1 py-0.5 rounded text-xs"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center bg-black/40 px-2 py-1 rounded">
              <span className="text-gray-400">Squeektoshi Core:</span>
              <span className={`font-bold flex items-center gap-1.5 ${isRunning ? 'text-green-400' : 'text-amber-300'}`}>
                <span className={`w-2 h-2 rounded-full inline-block ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}`} />
                {status.coreStatus}
              </span>
            </div>

            <div className="flex justify-between items-center bg-black/40 px-2 py-1 rounded">
              <span className="text-gray-400">Wheel Speed (RPM):</span>
              <span className="font-bold text-amber-400">{status.rpm} RPM</span>
            </div>

            <div className="flex justify-between items-center bg-black/40 px-2 py-1 rounded">
              <span className="text-gray-400">PoW Work Units:</span>
              <span className="text-cyan-300 font-mono text-[11px] truncate max-w-[120px]">
                {parseInt(status.cumulativeWork || '0').toLocaleString()} WU
              </span>
            </div>

            <div className="flex justify-between items-center bg-black/40 px-2 py-1 rounded">
              <span className="text-gray-400">Current Round:</span>
              <span className="text-purple-300 font-bold">Round #{economy.currentRound}</span>
            </div>

            <div className="flex justify-between items-center bg-amber-950/40 border border-amber-500/30 px-2 py-1.5 rounded mt-1">
              <span className="text-amber-300">RPG Combat Buff:</span>
              <span className="text-yellow-400 font-bold">
                {isRunning ? `⚡ ATK +${Math.round((status.rpm / 100 * 30) + 20)}% (Frenzy)` : '🛡️ DEF Mode (+20%)'}
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-amber-500/20 flex justify-between items-center text-[10px] text-gray-400">
            <span>Network: Sepolia (11155111)</span>
            <span className={connected ? 'text-green-400' : 'text-yellow-500'}>
              {connected ? '● Connected' : '○ Reconnecting'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
