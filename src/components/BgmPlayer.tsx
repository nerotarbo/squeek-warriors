// 原版 BGM 播放器 —— 隐藏 <audio>，音源由本站后端代理，可靠可发声
import { useEffect, useRef, useState } from 'react';
import { OST, ostUrl } from '@/game/ost';

export default function BgmPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [on, setOn] = useState(true);
  const [failed, setFailed] = useState(false);
  const wantRef = useRef<string | null>(null);

  useEffect(() => {
    const play = (id: string) => {
      const a = audioRef.current;
      if (!a) return;
      wantRef.current = id;
      setFailed(false);
      a.src = ostUrl(id);
      a.loop = OST[id]?.loop ?? true;
      a.volume = 1;
      a.play().catch(() => setFailed(true));
    };
    const onOst = (e: Event) => {
      const id = (e as CustomEvent).detail as string | null;
      setTrackId(id);
      if (id) play(id);
      else audioRef.current?.pause();
    };
    const onToggle = () => {
      const a = audioRef.current;
      setOn((v) => {
        const next = !v;
        if (a) {
          if (next && wantRef.current) a.play().catch(() => setFailed(true));
          else a.pause();
        }
        return next;
      });
    };
    window.addEventListener('game-ost', onOst);
    window.addEventListener('game-ost-toggle', onToggle);
    return () => {
      window.removeEventListener('game-ost', onOst);
      window.removeEventListener('game-ost-toggle', onToggle);
    };
  }, []);

  const track = trackId ? OST[trackId] : null;

  return (
    <>
      <audio
        ref={audioRef}
        preload="auto"
        onError={() => {
          setFailed(true);
          // 2 秒后自动重试一次
          const id = wantRef.current;
          setTimeout(() => {
            const a = audioRef.current;
            if (a && id && wantRef.current === id) {
              a.src = ostUrl(id);
              a.play().catch(() => {});
            }
          }, 2000);
        }}
        onPlaying={() => setFailed(false)}
      />
      {track && (
        <div
          className="fixed left-1/2 top-1/2 pointer-events-none z-20"
          style={{ transform: 'translate(calc(-50% - 232 * min(100vw / 480, 100vh / 270)), calc(-50% - 127 * min(100vw / 480, 100vh / 270)))' }}
        >
          <div className="flex items-center gap-1 text-[9px] leading-none" style={{ fontFamily: 'monospace' }}>
            <span className={on && !failed ? 'text-[#ffe94a] animate-pulse' : 'text-gray-600'}>♪</span>
            <span className="text-[#c8d8f0] bg-[#0a0e28]/70 px-1 py-0.5 rounded-sm border border-[#5a6ac8]/50">
              {failed ? '音乐加载中…' : on ? `${track.name}（${track.source}）` : 'M 键恢复音乐'}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
