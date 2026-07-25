import { useEffect, useRef, useState } from 'react';
import { PixelSprite } from '@/components/sprites/PixelSprite';
import {
  MASCOT_BODY,
  MASCOT_JUMP,
  MASCOT_ARM,
  PALETTE,
} from '@/components/sprites/sprites';
import { sound } from '@/utils/sound';
import { usePrefersReducedMotion } from '@/hooks';

const SESSION_KEY = 'coinbuddy-journey-done';

type Stage = 'parked' | 'jumpoff' | 'run' | 'hop' | 'land' | 'point' | 'gone';

interface Frame {
  x: number;
  y: number;
  scale: number;
  facing: 1 | -1;
  stage: Stage;
  arm: boolean;
}

export function MascotJourney() {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(false);
  const heroMascotRef = useRef<DOMRect | null>(null);
  const arcadeRef = useRef<DOMRect | null>(null);
  const startedRef = useRef(false);

  // Refs for imperative DOM updates (avoids per-frame React re-renders).
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const armRef = useRef<HTMLDivElement | null>(null);
  const shadowRef = useRef<HTMLDivElement | null>(null);
  const spriteRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (reduced) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const measure = () => {
      const mascotEl = document.querySelector('[data-mascot]') as HTMLElement | null;
      const arcadeEl = document.getElementById('arcade');
      if (!mascotEl || !arcadeEl) return false;
      heroMascotRef.current = mascotEl.getBoundingClientRect();
      const cab = arcadeEl.querySelector('.pixel-border.bg-ink') as HTMLElement | null;
      const cabRect = cab ? cab.getBoundingClientRect() : arcadeEl.getBoundingClientRect();
      arcadeRef.current = cabRect;
      return true;
    };

    if (!measure()) {
      const t = window.setTimeout(measure, 300);
      return () => window.clearTimeout(t);
    }

    const onScroll = () => {
      if (startedRef.current) return;
      const hero = heroMascotRef.current;
      if (!hero) return;
      const heroBottom = hero.bottom - window.scrollY;
      if (heroBottom < window.innerHeight * 0.7 && heroBottom > -window.innerHeight * 0.5) {
        startedRef.current = true;
        sessionStorage.setItem(SESSION_KEY, '1');
        window.removeEventListener('scroll', onScroll, true);
        runJourney();
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  function runJourney() {
    const hero = heroMascotRef.current;
    const arcade = arcadeRef.current;
    if (!hero || !arcade) return;
    setActive(true);

    const mascotEl = document.querySelector('[data-mascot]') as HTMLElement | null;
    const arcadeEl = document.getElementById('arcade');
    if (!mascotEl || !arcadeEl) return;
    const h = mascotEl.getBoundingClientRect();
    const cab = arcadeEl.querySelector('.pixel-border.bg-ink') as HTMLElement | null;
    const a = cab ? cab.getBoundingClientRect() : arcadeEl.getBoundingClientRect();

    const spriteW = 16 * 3 * 3.4;
    const startX = h.left + h.width / 2 - spriteW / 2;
    const startY = h.top;
    const endX = a.left - spriteW * 0.55;
    const endY = a.bottom - spriteW * 0.9;

    const stages: { stage: Stage; dur: number; fn: (p: number) => Partial<Frame> }[] = [
      { stage: 'jumpoff', dur: 600, fn: (p) => ({ y: startY - Math.sin(p * Math.PI) * 90, scale: 3.4 + Math.sin(p * Math.PI) * 0.1 }) },
      { stage: 'run', dur: 900, fn: (p) => {
        const ease = 1 - Math.pow(1 - p, 2);
        return { x: startX + (endX - startX) * 0.6 * ease, y: startY + (endY - startY) * 0.5 * ease, scale: 3.4 };
      } },
      { stage: 'hop', dur: 450, fn: (p) => ({ y: (startY + (endY - startY) * 0.5) - Math.sin(p * Math.PI) * 50, scale: 3.4 + Math.sin(p * Math.PI) * 0.08 }) },
      { stage: 'land', dur: 400, fn: (p) => {
        const ease = 1 - Math.pow(1 - p, 3);
        return { x: startX + (endX - startX) * (0.6 + 0.4 * ease), y: endY, scale: 3.4 - Math.sin(p * Math.PI) * 0.06 };
      } },
      { stage: 'point', dur: 700, fn: () => ({ arm: true, facing: 1 }) },
    ];

    let cancelled = false;
    let i = 0;
    let stageStart = performance.now();
    let curX = startX;
    let curY = startY;
    let curScale = 3.4;
    let curFacing: 1 | -1 = 1;
    let curArm = false;
    let curStage: Stage = 'jumpoff';

    sound.jump();

    const apply = () => {
      const wrap = wrapRef.current;
      const inner = innerRef.current;
      const shadow = shadowRef.current;
      const arm = armRef.current;
      if (wrap) {
        wrap.style.left = `${curX}px`;
        wrap.style.top = `${curY}px`;
      }
      if (inner) {
        inner.style.transform = `scaleX(${curFacing})`;
      }
      if (shadow) {
        const jumping = curStage === 'jumpoff' || curStage === 'hop';
        shadow.style.transform = `scaleX(${jumping ? 0.6 : 1})`;
      }
      if (arm) {
        arm.style.display = curArm ? 'block' : 'none';
      }
    };

    const loop = (now: number) => {
      if (cancelled) return;
      if (document.hidden) {
        requestAnimationFrame(loop);
        return;
      }
      const stage = stages[i];
      const p = Math.min(1, (now - stageStart) / stage.dur);
      const partial = stage.fn(p);
      if (partial.x !== undefined) curX = partial.x;
      if (partial.y !== undefined) curY = partial.y;
      if (partial.scale !== undefined) curScale = partial.scale;
      if (partial.facing !== undefined) curFacing = partial.facing;
      if (partial.arm !== undefined) curArm = partial.arm;
      curStage = stage.stage;

      apply();

      if (p >= 1) {
        i++;
        stageStart = now;
        if (stage.stage === 'jumpoff') sound.land();
        if (stage.stage === 'hop') sound.land();
        if (i >= stages.length) {
          if (wrapRef.current) wrapRef.current.style.opacity = '0';
          window.setTimeout(() => setActive(false), 500);
          return;
        }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    return () => { cancelled = true; };
  }

  if (!active || reduced) return null;

  return (
    <div
      className="mascot-journey pointer-events-none fixed inset-0 z-[900]"
      ref={wrapRef}
      style={{ transition: 'opacity 0.5s ease' }}
      aria-hidden
    >
      <div
        ref={innerRef}
        style={{
          position: 'absolute',
          transformOrigin: 'center bottom',
        }}
      >
        <div ref={armRef} style={{ display: 'none', position: 'absolute', left: 14 * 3 * 3.4, top: 22 * 3.4, animation: 'wave-arm 0.45s ease-in-out infinite', transformOrigin: 'bottom center' }}>
          <PixelSprite grid={MASCOT_ARM} palette={PALETTE} pixel={3} scale={3.4 * 0.9} />
        </div>
        <div ref={spriteRef}>
          <PixelSprite grid={MASCOT_BODY} palette={PALETTE} pixel={3} scale={3.4} />
        </div>
        <div
          ref={shadowRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 16 * 3 * 3.4,
            width: 60 * 3.4,
            height: 10 * 3.4,
            background: 'rgba(0,0,0,0.25)',
            borderRadius: '50%',
            filter: 'blur(2px)',
            transition: 'transform 0.2s ease',
          }}
        />
      </div>
    </div>
  );
}
