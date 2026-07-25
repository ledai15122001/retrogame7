import { useState, useCallback, useRef, useMemo } from 'react';
import { PixelSprite } from '@/components/sprites/PixelSprite';
import { COIN_FRONT, COIN_SIDE, PALETTE } from '@/components/sprites/sprites';
import { sound } from '@/utils/sound';
import { useRaf } from '@/hooks';

interface CollectPop {
  id: number;
  x: number;
  y: number;
}

let popId = 0;

const COIN_STYLE: React.CSSProperties = { transition: 'transform 0.1s ease' };

/**
 * A spinning pixel coin. Spins continuously; spins faster on hover.
 * Click to "collect" — plays a sound and pops a "+1" that floats up.
 *
 * Performance: the spin animation is driven imperatively by toggling the
 * front/side sprite layers' opacity via refs — no per-frame React re-renders.
 */
export function SpinningCoin({
  size = 1,
  className = '',
  fastHover = true,
}: {
  size?: number;
  className?: string;
  fastHover?: boolean;
}) {
  const [hovering, setHovering] = useState(false);
  const [pops, setPops] = useState<CollectPop[]>([]);
  const phase = useRef(0);
  const frontRef = useRef<HTMLDivElement | null>(null);
  const sideRef = useRef<HTMLDivElement | null>(null);
  const hoveringRef = useRef(false);

  useRaf((dt) => {
    const speed = hoveringRef.current && fastHover ? 0.012 : 0.0035;
    phase.current += dt * speed;
    const frame = Math.floor(phase.current % 8);
    const showFront = frame !== 2 && frame !== 6;
    if (frontRef.current) frontRef.current.style.opacity = showFront ? '1' : '0';
    if (sideRef.current) sideRef.current.style.opacity = showFront ? '0' : '1';
  });

  const onMouseEnter = useCallback(() => {
    setHovering(true);
    hoveringRef.current = true;
  }, []);
  const onMouseLeave = useCallback(() => {
    setHovering(false);
    hoveringRef.current = false;
  }, []);

  const collect = useCallback((e: React.MouseEvent) => {
    sound.coin();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const id = ++popId;
    setPops((p) => [
      ...p,
      { id, x: e.clientX - rect.left, y: e.clientY - rect.top },
    ]);
    setTimeout(() => setPops((p) => p.filter((pop) => pop.id !== id)), 900);
  }, []);

  const btnStyle = useMemo(
    () => ({ background: 'none', border: 'none', padding: 0 }),
    []
  );

  return (
    <button
      type="button"
      className={`relative cursor-pointer outline-none ${className}`}
      style={btnStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={collect}
      aria-label="Collect a coin"
    >
      <div ref={frontRef} style={{ position: 'absolute', inset: 0 }}>
        <PixelSprite grid={COIN_FRONT} palette={PALETTE} pixel={4} scale={size} style={COIN_STYLE} />
      </div>
      <div ref={sideRef} style={{ position: 'absolute', inset: 0, opacity: 0 }}>
        <PixelSprite grid={COIN_SIDE} palette={PALETTE} pixel={4} scale={size} style={COIN_STYLE} />
      </div>
      {pops.map((pop) => (
        <span
          key={pop.id}
          className="pointer-events-none absolute font-pixel text-gold"
          style={{
            left: pop.x,
            top: pop.y,
            fontSize: '0.7rem',
            color: '#ffd23f',
            textShadow: '2px 2px 0 #1a1530',
            animation: 'rise 0.9s ease-out forwards',
            transform: 'translate(-50%, -50%)',
          }}
        >
          +1
        </span>
      ))}
    </button>
  );
}
