import { useState, useRef, useCallback, useEffect, memo } from 'react';
import { PixelSprite } from '@/components/sprites/PixelSprite';
import {
  MASCOT_BODY,
  MASCOT_JUMP,
  MASCOT_WINK,
  MASCOT_ARM,
  PALETTE,
} from '@/components/sprites/sprites';
import { sound } from '@/utils/sound';
import { useMouseLerp, useRandomInterval } from '@/hooks';

const MESSAGES = [
  'gm',
  'wen moon',
  'touch grass',
  'based',
  'LFG',
  "number go up",
  "we're so back",
  'wagmi',
  'ser, buy',
  'hodl',
];

type Pose = 'idle' | 'jump' | 'wave';

/**
 * The mascot: a chubby coin-creature.
 * Idle bounces, blinks, eyes follow the cursor, jumps when clicked,
 * waves on a random idle timer, shows a speech bubble on hover,
 * puffs dust when it lands.
 *
 * Performance: eye-tracking uses useMouseLerp (ref-based, no re-renders)
 * and writes pupil transforms imperatively in a single rAF loop.
 */
export function Mascot({ size = 3 }: { size?: number }) {
  const mouse = useMouseLerp();
  const [pose, setPose] = useState<Pose>('idle');
  const [jumping, setJumping] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleMsg, setBubbleMsg] = useState(MESSAGES[0]);
  const [dust, setDust] = useState<{ id: number; left: number }[]>([]);
  const [armWave, setArmWave] = useState(false);
  const [bounceY, setBounceY] = useState(0);
  const [blink, setBlink] = useState(false);

  const ref = useRef<HTMLDivElement | null>(null);
  const pupilLRef = useRef<HTMLDivElement | null>(null);
  const pupilRRef = useRef<HTMLDivElement | null>(null);
  const dustId = useRef(0);
  const blinkTimer = useRef<number | undefined>(undefined);

  // idle bounce is a pure CSS animation (no per-frame re-renders);
  // jump overrides it imperatively via the bounceY transform below.

  // random blink
  useEffect(() => {
    const loop = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
      blinkTimer.current = window.setTimeout(loop, 2500 + Math.random() * 2500);
    };
    blinkTimer.current = window.setTimeout(loop, 2000);
    return () => window.clearTimeout(blinkTimer.current);
  }, []);

  // random idle animation every ~10s (wave)
  useRandomInterval(
    () => {
      if (pose !== 'idle') return;
      setPose('wave');
      setArmWave(true);
      setTimeout(() => {
        setPose('idle');
        setArmWave(false);
      }, 1600);
    },
    8000,
    13000
  );

  const jump = useCallback(() => {
    if (jumping) return;
    sound.jump();
    setPose('jump');
    setJumping(true);
    setBounceY(-48);
    setTimeout(() => {
      setBounceY(0);
      sound.land();
      // dust on land
      const newDust = Array.from({ length: 6 }, (_, i) => ({
        id: ++dustId.current,
        left: (i - 3) * 10 + 50,
      }));
      setDust(newDust);
      setTimeout(() => setDust([]), 600);
      setTimeout(() => {
        setPose('idle');
        setJumping(false);
      }, 200);
    }, 420);
  }, [jumping]);

  const onHover = useCallback(() => {
    setShowBubble(true);
    setBubbleMsg(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
  }, []);

  // React to external "buy hover" events (mascot winks excitedly)
  useEffect(() => {
    const onBuyHover = () => {
      setBubbleMsg('LFG');
      setShowBubble(true);
      setPose('wave');
      setArmWave(true);
      setTimeout(() => {
        setShowBubble(false);
        setPose('idle');
        setArmWave(false);
      }, 1600);
    };
    window.addEventListener('mascot:buyHover', onBuyHover as EventListener);
    return () => window.removeEventListener('mascot:buyHover', onBuyHover as EventListener);
  }, []);

  // eye-tracking: write pupil offsets imperatively from the ref-based
  // mouse lerp — no React re-renders per mouse move.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const mx = mouse.current.x * 1.2;
      const my = mouse.current.y * 0.8;
      const lx = (6 + mx) * 3 * size;
      const ly = (5 + my) * 3 * size;
      const rx = (10 + mx) * 3 * size;
      const ry = (5 + my) * 3 * size;
      if (pupilLRef.current) pupilLRef.current.style.transform = `translate(${lx}px, ${ly}px)`;
      if (pupilRRef.current) pupilRRef.current.style.transform = `translate(${rx}px, ${ry}px)`;
      raf = requestAnimationFrame(loop);
    };
    const start = () => { raf = requestAnimationFrame(loop); };
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        start();
      }
    };
    start();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [mouse, size]);

  const currentGrid = pose === 'jump' ? MASCOT_JUMP : pose === 'wave' ? MASCOT_WINK : MASCOT_BODY;

  return (
    <div
      ref={ref}
      className="relative select-none"
      style={{
        transform: `translateY(${bounceY}px)`,
        transition: jumping ? 'transform 0.42s cubic-bezier(.5,0,.6,1)' : 'transform 0.18s ease-out',
        animation: pose === 'idle' ? 'mascot-idle-bob 1.2s ease-in-out infinite' : 'none',
      }}
      onMouseEnter={onHover}
      onMouseLeave={() => setShowBubble(false)}
      onClick={jump}
    >
      {/* speech bubble */}
      {showBubble && (
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: -52, animation: 'popIn 0.2s ease-out both' }}
        >
          <div
            className="pixel-border bg-cream px-3 py-2 font-pixel text-[0.6rem] text-ink"
            style={{ whiteSpace: 'nowrap' }}
          >
            {bubbleMsg}
          </div>
          <div
            className="mx-auto mt-0 h-0 w-0"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '8px solid #1a1530',
            }}
          />
        </div>
      )}

      {/* waving arm */}
      {armWave && (
        <div
          className="absolute"
          style={{ left: -14 * size, top: 22 * size, animation: 'wave-arm 0.5s ease-in-out infinite' }}
        >
          <PixelSprite grid={MASCOT_ARM} palette={PALETTE} pixel={3} scale={size * 0.9} />
        </div>
      )}

      {/* mascot body */}
      <div className="relative cursor-pointer" style={{ transform: pose === 'wave' ? 'rotate(-3deg)' : 'none', transition: 'transform 0.2s ease' }}>
        <PixelSprite grid={currentGrid} palette={PALETTE} pixel={3} scale={size} />

        {/* pupils overlay (eye-tracking) — only when not blinking/jumping.
            Positioned imperatively via refs to avoid per-frame re-renders. */}
        {pose !== 'jump' && !blink && (
          <>
            <div ref={pupilLRef} className="pointer-events-none absolute left-0 top-0">
              <PixelSprite grid={['p']} palette={PALETTE} pixel={3} scale={size} />
            </div>
            <div ref={pupilRRef} className="pointer-events-none absolute left-0 top-0">
              <PixelSprite grid={['p']} palette={PALETTE} pixel={3} scale={size} />
            </div>
          </>
        )}

        {/* blink overlay — draw a line over eyes */}
        {blink && pose !== 'jump' && (
          <>
            <div
              className="absolute"
              style={{
                left: 5 * 3 * size,
                top: 5 * 3 * size + size,
                width: 2 * 3 * size,
                height: size,
                background: '#1a1530',
              }}
            />
            <div
              className="absolute"
              style={{
                left: 9 * 3 * size,
                top: 5 * 3 * size + size,
                width: 2 * 3 * size,
                height: size,
                background: '#1a1530',
              }}
            />
          </>
        )}
      </div>

      {/* dust particles on land */}
      {dust.map((d) => (
        <span
          key={d.id}
          className="pointer-events-none absolute bottom-0"
          style={{
            left: `${d.left}%`,
            width: 6,
            height: 6,
            background: '#d8c9a6',
            animation: 'dust 0.6s ease-out forwards',
          }}
        />
      ))}

      {/* shadow */}
      <div
        className="mx-auto mt-1 rounded-[50%] bg-black/30"
        style={{
          width: 60 * size,
          height: 10 * size,
          filter: 'blur(2px)',
          transform: `scaleX(${jumping ? 0.6 : 1})`,
          transition: 'transform 0.3s ease',
        }}
      />
    </div>
  );
}
