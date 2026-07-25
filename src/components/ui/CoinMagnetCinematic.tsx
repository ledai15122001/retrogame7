import { useEffect, useRef, useState, useCallback } from 'react';
import { PixelSprite } from '@/components/sprites/PixelSprite';
import { COIN_FRONT, COIN_SIDE, PALETTE } from '@/components/sprites/sprites';
import { sound } from '@/utils/sound';
import { usePrefersReducedMotion } from '@/hooks';

/**
 * COIN MAGNET CINEMATIC — one-shot scripted moment.
 *
 * Plays automatically ~1.8s after the hero is visible, exactly once per
 * page visit (sessionStorage guard). Sequence:
 *  1. A single coin falls; mascot "notices" (looks up).
 *  2. A few more coins fall with randomized timing/position.
 *  3. Mascot becomes a magnet: all coins curve toward it, rotating,
 *     leaving sparkle trails.
 *  4. On arrival: pixel sparkle burst + radial glow + light camera shake
 *     + mascot squash-and-stretch.
 *  5. "GET RICH." pixel text rises and fades.
 *  6. Returns to idle. Never loops.
 *
 * Performance: all motion is transform/opacity only, driven by ONE rAF
 * loop that writes transforms directly to pooled DOM nodes — no React
 * re-renders per frame. The loop self-terminates when the sequence
 * completes and pauses when off-screen. Respects prefers-reduced-motion.
 */

const SESSION_KEY = 'coinbuddy-magnet-played';
const COIN_POOL = 12;
const SPARK_POOL = 80;

type Phase = 'wait' | 'first' | 'rain' | 'magnet' | 'burst' | 'message' | 'done';

interface Coin {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  side: boolean;
  size: number;
  state: 'falling' | 'magnetized' | 'done';
  curveBias: number;
  sparkleTimer: number;
}

interface Sparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
}

export function CoinMagnetCinematic() {
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>('wait');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const coinLayerRef = useRef<HTMLDivElement | null>(null);
  const sparkLayerRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  // pooled DOM nodes (created once via React render, mutated imperatively)
  const coinEls = useRef<(HTMLDivElement | null)[]>([]);
  const coinSideEls = useRef<(HTMLDivElement | null)[]>([]);
  const sparkEls = useRef<(HTMLDivElement | null)[]>([]);

  const coins = useRef<Coin[]>(
    Array.from({ length: COIN_POOL }, () => ({
      x: 0, y: 0, vx: 0, vy: 0, rot: 0, vrot: 0, side: false,
      size: 1, state: 'done', curveBias: 0, sparkleTimer: 0,
    }))
  );
  const sparkles = useRef<Sparkle[]>(
    Array.from({ length: SPARK_POOL }, () => ({
      x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 0, size: 1,
    }))
  );

  const mascotCenter = useRef({ x: 0, y: 0 });
  const shakeRef = useRef(0);
  const glowValRef = useRef(0);
  const squashRef = useRef(0);
  const lookUpRef = useRef(false);
  const phaseRef = useRef<Phase>('wait');
  const visibleRef = useRef(true);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const measure = useCallback(() => {
    const mascotEl = document.querySelector('[data-mascot]') as HTMLElement | null;
    const container = containerRef.current;
    if (!mascotEl || !container) return false;
    const mr = mascotEl.getBoundingClientRect();
    const cr = container.getBoundingClientRect();
    mascotCenter.current = {
      x: mr.left + mr.width / 2 - cr.left,
      y: mr.top + mr.height * 0.4 - cr.top,
    };
    return true;
  }, []);

  const spawnCoin = (x: number, size = 1) => {
    const co = coins.current.find((c) => c.state === 'done');
    if (!co) return;
    const idx = coins.current.indexOf(co);
    co.x = x;
    co.y = -40;
    co.vx = (Math.random() - 0.5) * 20;
    co.vy = 60 + Math.random() * 40;
    co.rot = Math.random() * Math.PI * 2;
    co.vrot = (Math.random() - 0.5) * 6;
    co.side = Math.random() > 0.5;
    co.size = size;
    co.state = 'falling';
    co.curveBias = (Math.random() - 0.5) * 120;
    co.sparkleTimer = 0;
    const el = coinEls.current[idx];
    const sideEl = coinSideEls.current[idx];
    if (el) { el.style.opacity = '1'; el.style.display = 'block'; }
    if (sideEl) { sideEl.style.opacity = '1'; sideEl.style.display = 'block'; }
  };

  const spawnSparkle = (x: number, y: number, burst = false) => {
    const sp = sparkles.current.find((s) => s.life >= s.max);
    if (!sp) return;
    const idx = sparkles.current.indexOf(sp);
    const ang = Math.random() * Math.PI * 2;
    const spd = burst ? 60 + Math.random() * 120 : 10 + Math.random() * 20;
    sp.x = x;
    sp.y = y;
    sp.vx = Math.cos(ang) * spd;
    sp.vy = Math.sin(ang) * spd - (burst ? 30 : 0);
    sp.life = 0;
    sp.max = burst ? 0.6 + Math.random() * 0.4 : 0.4 + Math.random() * 0.3;
    sp.size = burst ? 1.2 + Math.random() * 0.6 : 0.8;
    const el = sparkEls.current[idx];
    if (el) el.style.display = 'block';
  };

  // main orchestration + rAF loop
  useEffect(() => {
    if (reduced) return;
    if (import.meta.env.DEV) sessionStorage.removeItem(SESSION_KEY);
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, '1');

    const timers: number[] = [];
    let cancelled = false;

    const waitForMascot = () => {
      if (cancelled) return;
      if (measure()) startCinematic();
      else requestAnimationFrame(waitForMascot);
    };

    const startCinematic = () => {
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          setPhase('first');
          phaseRef.current = 'first';
          const c = mascotCenter.current;
          spawnCoin(c.x + (Math.random() - 0.5) * 60, 1);
          lookUpRef.current = true;
          sound.tap();

          timers.push(
            window.setTimeout(() => {
              if (cancelled) return;
              setPhase('rain');
              phaseRef.current = 'rain';
              for (let i = 0; i < 5; i++) {
                const delay = i * 180 + Math.random() * 220;
                timers.push(
                  window.setTimeout(() => {
                    if (cancelled) return;
                    spawnCoin(c.x + (Math.random() - 0.5) * 260, 0.9 + Math.random() * 0.3);
                  }, delay)
                );
              }
            }, 900)
          );

          timers.push(
            window.setTimeout(() => {
              if (cancelled) return;
              setPhase('magnet');
              phaseRef.current = 'magnet';
              sound.confirm();
              coins.current.forEach((co) => {
                if (co.state === 'falling') co.state = 'magnetized';
              });
            }, 2900)
          );
        }, 1800)
      );
    };

    requestAnimationFrame(waitForMascot);

    const container = containerRef.current;
    let ioCleanup: (() => void) | undefined;
    if (container) {
      const io = new IntersectionObserver(
        (entries) => { visibleRef.current = entries[0].isIntersecting; },
        { threshold: 0.01 }
      );
      io.observe(container);
      ioCleanup = () => io.disconnect();
    }

    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      if (cancelled) return;
      if (visibleRef.current) {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        const c = mascotCenter.current;

        for (let i = 0; i < coins.current.length; i++) {
          const co = coins.current[i];
          if (co.state === 'done') continue;
          if (co.state === 'falling') {
            co.vy += 120 * dt;
            co.x += co.vx * dt;
            co.y += co.vy * dt;
            co.rot += co.vrot * dt;
          } else if (co.state === 'magnetized') {
            const dx = c.x - co.x;
            const dy = c.y - co.y;
            const dist = Math.hypot(dx, dy) || 1;
            const accel = 900 + (1 - Math.min(dist / 400, 1)) * 1400;
            const nx = dx / dist;
            const ny = dy / dist;
            const px = -ny;
            const py = nx;
            co.vx += (nx * accel + px * co.curveBias * 3) * dt;
            co.vy += (ny * accel + py * co.curveBias * 3) * dt;
            co.curveBias *= 0.92;
            const sp = Math.hypot(co.vx, co.vy);
            const max = 700;
            if (sp > max) {
              co.vx = (co.vx / sp) * max;
              co.vy = (co.vy / sp) * max;
            }
            co.x += co.vx * dt;
            co.y += co.vy * dt;
            co.rot += co.vrot * dt * 2.5;
            co.vrot *= 0.98;
            co.sparkleTimer += dt;
            if (co.sparkleTimer > 0.08) {
              co.sparkleTimer = 0;
              spawnSparkle(co.x, co.y);
            }
            if (dist < 28) {
              co.state = 'done';
              for (let k = 0; k < 6; k++) spawnSparkle(c.x, c.y, true);
              shakeRef.current = 1;
              glowValRef.current = 1;
              squashRef.current = 1;
              sound.coin();
            }
          }
          const el = coinEls.current[i];
          const sideEl = coinSideEls.current[i];
          const showSide = co.side;
          if (el) {
            el.style.transform = `translate(${co.x}px, ${co.y}px) rotate(${co.rot}rad) scale(${co.size})`;
            el.style.opacity = showSide ? '0' : (co.state === 'done' ? '0' : '1');
            if (co.state === 'done') el.style.display = 'none';
          }
          if (sideEl) {
            sideEl.style.transform = `translate(${co.x}px, ${co.y}px) rotate(${co.rot}rad) scale(${co.size})`;
            sideEl.style.opacity = showSide ? (co.state === 'done' ? '0' : '1') : '0';
            if (co.state === 'done') sideEl.style.display = 'none';
          }
        }

        for (let i = 0; i < sparkles.current.length; i++) {
          const sp = sparkles.current[i];
          if (sp.life >= sp.max) continue;
          sp.life += dt;
          sp.x += sp.vx * dt;
          sp.y += sp.vy * dt;
          sp.vy += 200 * dt;
          sp.vx *= 0.96;
          const a = 1 - sp.life / sp.max;
          const el = sparkEls.current[i];
          if (el) {
            el.style.transform = `translate(${sp.x}px, ${sp.y}px) scale(${sp.size * (0.5 + a * 0.5)})`;
            el.style.opacity = String(a);
            if (sp.life >= sp.max) el.style.display = 'none';
          }
        }

        shakeRef.current = Math.max(0, shakeRef.current - dt * 3);
        glowValRef.current = Math.max(0, glowValRef.current - dt * 1.2);
        squashRef.current = Math.max(0, squashRef.current - dt * 2.5);

        if (glowRef.current) glowRef.current.style.opacity = String(glowValRef.current);
        const shake = shakeRef.current;
        const sx = shake > 0 ? (Math.random() - 0.5) * 6 * shake : 0;
        const sy = shake > 0 ? (Math.random() - 0.5) * 6 * shake : 0;
        if (container) container.style.transform = `translate(${sx}px, ${sy}px)`;

        if (
          phaseRef.current === 'magnet' &&
          coins.current.every((co) => co.state === 'done') &&
          glowValRef.current > 0.4
        ) {
          setPhase('burst');
          phaseRef.current = 'burst';
          timers.push(
            window.setTimeout(() => {
              if (cancelled) return;
              setPhase('message');
              phaseRef.current = 'message';
              timers.push(
                window.setTimeout(() => {
                  if (cancelled) return;
                  setPhase('done');
                  phaseRef.current = 'done';
                  lookUpRef.current = false;
                }, 1100)
              );
            }, 350)
          );
        }
      } else {
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
      if (ioCleanup) ioCleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  // re-measure on resize
  useEffect(() => {
    if (reduced) return;
    const onResize = () => measure();
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, [reduced, measure]);

  // squash-and-stretch + look-up applied imperatively to the real mascot
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const loop = () => {
      const el = document.querySelector('[data-mascot]') as HTMLElement | null;
      if (el) {
        const sq = squashRef.current || 0;
        const sx = 1 - sq * 0.18;
        const sy = 1 + sq * 0.18;
        const look = lookUpRef.current ? -6 : 0;
        el.style.transform = `translateY(${look}px) scale(${sx}, ${sy})`;
        el.style.transformOrigin = 'center bottom';
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      const el = document.querySelector('[data-mascot]') as HTMLElement | null;
      if (el) { el.style.transform = ''; el.style.transformOrigin = ''; }
    };
  }, [reduced]);

  if (reduced) return null;
  if (phase === 'done') return null;
  const waiting = phase === 'wait';

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
      style={{ visibility: waiting ? 'hidden' : 'visible' }}
      aria-hidden
    >
      <div
        ref={glowRef}
        style={{
          position: 'absolute',
          left: mascotCenter.current.x,
          top: mascotCenter.current.y,
          width: 200, height: 200,
          marginLeft: -100, marginTop: -100,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,210,63,0.5) 0%, rgba(255,210,63,0) 70%)',
          opacity: 0,
          willChange: 'opacity',
        }}
      />
      {/* coin pool — front + side faces stacked, toggled by opacity */}
      <div ref={coinLayerRef} className="absolute inset-0">
        {Array.from({ length: COIN_POOL }).map((_, i) => (
          <div key={i} style={{ position: 'absolute', left: 0, top: 0, willChange: 'transform', opacity: 0, display: 'none' }}
            ref={(el) => { coinEls.current[i] = el; }}>
            <PixelSprite grid={COIN_FRONT} palette={PALETTE} pixel={3} scale={1.4} />
          </div>
        ))}
        {Array.from({ length: COIN_POOL }).map((_, i) => (
          <div key={`s${i}`} style={{ position: 'absolute', left: 0, top: 0, willChange: 'transform', opacity: 0, display: 'none' }}
            ref={(el) => { coinSideEls.current[i] = el; }}>
            <PixelSprite grid={COIN_SIDE} palette={PALETTE} pixel={3} scale={1.4} />
          </div>
        ))}
      </div>
      {/* sparkle pool */}
      <div ref={sparkLayerRef} className="absolute inset-0">
        {Array.from({ length: SPARK_POOL }).map((_, i) => (
          <div key={i}
            ref={(el) => { sparkEls.current[i] = el; }}
            style={{
              position: 'absolute', left: 0, top: 0, width: 4, height: 4,
              background: '#fff', borderRadius: '50%',
              boxShadow: '0 0 6px #ffd23f',
              willChange: 'transform, opacity', opacity: 0, display: 'none',
            }}
          />
        ))}
      </div>
      {phase === 'message' && (
        <div
          style={{
            position: 'absolute',
            left: mascotCenter.current.x,
            top: mascotCenter.current.y - 120,
            transform: 'translateX(-50%)',
            animation: 'getrich-rise 1.1s ease-out forwards',
          }}
          className="font-pixel text-gold"
        >
          <span style={{ fontSize: 'clamp(0.8rem, 2.4vw, 1.3rem)', textShadow: '0 0 10px rgba(255,210,63,0.7), 2px 2px 0 #1a1530' }}>
            GET RICH.
          </span>
        </div>
      )}
    </div>
  );
}
