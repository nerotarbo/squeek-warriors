// 手机触屏手柄 —— 十字键 + A/B/音乐键，仅触屏设备显示
import { useEffect, useState } from 'react';
import { toggleOst } from '@/game/ost';

function sendKey(type: 'keydown' | 'keyup', code: string) {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }));
}

function PadButton({
  label, code, className = '', wide = false, onTap,
}: {
  label: string; code?: string; className?: string; wide?: boolean;
  onTap?: () => void;
}) {
  const [active, setActive] = useState(false);
  const press = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setActive(true);
    if (onTap) onTap();
    else if (code) sendKey('keydown', code);
  };
  const release = (e: React.PointerEvent) => {
    e.preventDefault();
    setActive(false);
    if (!onTap && code) sendKey('keyup', code);
  };
  return (
    <button
      className={`${wide ? 'w-12 h-8 rounded-lg' : 'w-10 h-10 rounded-full'} select-none touch-none
        flex items-center justify-center text-xs font-bold border-2 transition-colors
        ${active
          ? 'bg-[#ffe9a8]/80 border-[#ffe9a8] text-black scale-95'
          : 'bg-[#0a0e28]/45 border-[#e8e8f0]/40 text-[#e8e8f0]/80'
        } backdrop-blur-sm ${className}`}
      style={{ fontFamily: 'monospace', WebkitTapHighlightColor: 'transparent' }}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

export default function TouchControls() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // 始终显示虚拟按键或在触屏设备上显示
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => {
      // 触屏或小屏幕窗口均展示虚拟手柄，方便直接用鼠标点击或触屏操作
      setShow(mq.matches || 'ontouchstart' in window || window.innerWidth < 1024);
    };
    update();
    window.addEventListener('resize', update);
    mq.addEventListener?.('change', update);
    return () => {
      window.removeEventListener('resize', update);
      mq.removeEventListener?.('change', update);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-30 pointer-events-none select-none">
      {/* 左下：十字键（下移贴边，半透明不挡画面） */}
      <div className="absolute left-2 bottom-2 pointer-events-auto">
        <div className="grid grid-cols-3 grid-rows-3 gap-0.5 w-fit">
          <div />
          <PadButton label="▲" code="ArrowUp" />
          <div />
          <PadButton label="◀" code="ArrowLeft" />
          <div className="w-10 h-10 rounded-full bg-[#0a0e28]/25 border-2 border-[#e8e8f0]/15" />
          <PadButton label="▶" code="ArrowRight" />
          <div />
          <PadButton label="▼" code="ArrowDown" />
          <div />
        </div>
      </div>

      {/* 右下：A / B */}
      <div className="absolute right-2 bottom-2 pointer-events-auto flex items-end gap-2">
        <PadButton label="B" code="Escape" className="!bg-[#3c1420]/50 !border-[#ff7a5a]/50 !text-[#ffb8a8] mb-3" />
        <PadButton label="A" code="Enter" className="!bg-[#1a2a14]/55 !border-[#9ae08c]/55 !text-[#c8f0b8] w-12 h-12" />
      </div>

      {/* 右上：音乐开关 */}
      <div className="absolute right-2 top-2 pointer-events-auto">
        <PadButton label="♪" wide onTap={() => toggleOst()} />
      </div>
    </div>
  );
}
