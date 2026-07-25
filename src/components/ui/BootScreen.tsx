import { useEffect, useState, useRef } from 'react';
import { sound } from '@/utils/sound';
import { usePrefersReducedMotion } from '@/hooks';
import { PixelSprite } from '@/components/sprites/PixelSprite';
import { COIN_FRONT, PALETTE } from '@/components/sprites/sprites';

/**
 * Premium retro arcade power-on boot screen.
 *
 * Timeline (~4.0s total):
 *   0.00s  fade in from black, scanlines + flicker, coin floats, "INSERT COIN" blinks
 *   0.80s  coin drops with gravity into the coin slot -> spark + shake + metallic sound
 *   1.20s  "INSERT COIN" out, "BOOTING ARCADE SYSTEM..." typewriter in
 *   1.50s  progress lines type out one by one; loading bar fills smoothly 0->100%
 *   3.50s  100% reached -> 300ms pause -> golden flash + slot glow + PING
 *   3.80s  "READY!" pops in with sparkle particles, holds ~400ms
 *   4.00s  crossfade out, hero revealed underneath
 *
 * In DEV mode the boot screen always plays (no sessionStorage skip).
 * Respects prefers-reduced-motion (shortened to a quick fade).
 * Audio is guarded: sounds only fire if the AudioContext can resume.
 */
const SESSION_KEY = 'coinbuddy-booted';

type Phase = 'insert' | 'booting' | 'progress' | 'flash' | 'ready' | 'done';

const PROGRESS_LINES = [
  '✓ Loading Pixel World...',
  '✓ Connecting Token...',
  '✓ Initializing Mascot...',
  '✓ Loading Memes...',
  '✓ Preparing Moon Mission...',
  '✓ Ready.',
];

// timeline constants (ms)
const T_COIN_DROP = 800;
const T_BOOTING = 1200;
const T_PROGRESS = 1500;
const T_PROGRESS_END = 3500; // bar reaches 100% (fills over ~2s)
const T_FLASH = 3800; // 300ms pause after 100%
const T_READY = 3850; // READY! visible
const T_FADE_OUT = 4250; // READY holds ~400ms then crossfade
const T_DONE = 4600; // unmount

export function BootScreen({ onDone }: { onDone: () => void }) {
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>('insert');
  const [typedLines, setTypedLines] = useState<string[]>([]);
  const [exit, setExit] = useState(false);
  const [coinDropping, setCoinDropping] = useState(false);
  const [slotGlow, setSlotGlow] = useState(false);
  const [showSpark, setShowSpark] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);
  const shakeRef = useRef(0);
  const shakeOffsetRef = useRef({ x: 0, y: 0 });

  // Refs for imperative DOM updates (avoid per-frame React re-renders).
  const coinRef = useRef<HTMLDivElement | null>(null);
  const barFillRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const rafRef = useRef<number>(0);
  const barStartRef = useRef<number>(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const finish = () => {
    window.dispatchEvent(new Event('bootscreen:finished'));
    doneRef.current();
  };

  // audio-safe helper: only play if the context can actually resume.
  const trySound = (fn: () => void) => {
    try {
      fn();
    } catch {
      /* audio blocked — visuals still complete */
    }
  };

  // ---------- main orchestration ----------
  useEffect(() => {
    // In DEV, always show the boot screen. In prod, skip on repeat visits.
    if (!import.meta.env.DEV && sessionStorage.getItem(SESSION_KEY)) {
      finish();
      return;
    }
    sessionStorage.setItem(SESSION_KEY, '1');

    if (reduced) {
      const t1 = window.setTimeout(() => setPhase('ready'), 200);
      const t2 = window.setTimeout(() => {
        setExit(true);
        window.setTimeout(() => finish(), 260);
      }, 500);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }

    const timers: number[] = [];

    // 0.40s — coin begins dropping
    timers.push(
      window.setTimeout(() => {
        setCoinDropping(true);
      }, T_COIN_DROP)
    );

    // 0.80s — INSERT COIN out, BOOTING text in
    timers.push(window.setTimeout(() => setPhase('booting'), T_BOOTING));

    // 1.00s — progress lines + bar begin
    timers.push(window.setTimeout(() => setPhase('progress'), T_PROGRESS));

    // progress lines typewriter, staggered
    PROGRESS_LINES.forEach((line, i) => {
      const at = T_PROGRESS + i * 150;
      timers.push(
        window.setTimeout(() => {
          typewrite(line, (out) => {
            setTypedLines((prev) => {
              const next = [...prev];
              next[i] = out;
              return next;
            });
          });
        }, at)
      );
    });

    // 1.90s — bar hits 100% (imperative, no setState needed)
    timers.push(
      window.setTimeout(() => {
        setPhase('flash');
        setShowFlash(true);
        setSlotGlow(true);
        trySound(() => sound.ping());
        window.setTimeout(() => setShowFlash(false), 450);
      }, T_FLASH)
    );

    // 2.10s — READY!
    timers.push(
      window.setTimeout(() => {
        setPhase('ready');
        setShowSparkles(true);
        window.setTimeout(() => setShowSparkles(false), 700);
      }, T_READY)
    );

    // 2.35s — begin fade out (crossfade)
    timers.push(
      window.setTimeout(() => {
        setExit(true);
      }, T_FADE_OUT)
    );

    // 2.70s — unmount, hero fully visible
    timers.push(
      window.setTimeout(() => {
        finish();
      }, T_DONE)
    );

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [reduced]);

  // ---------- coin drop physics + shake (rAF, no re-render) ----------
  useEffect(() => {
    if (!coinDropping || reduced) return;
    let raf = 0;
    const start = performance.now();
    const dur = 420; // drop duration
    const dropDist = 150; // px to fall
    const loop = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const y = dropDist * (t * t);
      if (coinRef.current) coinRef.current.style.transform = `translateY(${y}px)`;
      if (coinRef.current) coinRef.current.style.opacity = (coinDropping && y > 140) ? '0' : '1';
      if (shakeRef.current > 0) {
        const s = shakeRef.current;
        shakeOffsetRef.current.x = (Math.random() - 0.5) * s;
        shakeOffsetRef.current.y = (Math.random() - 0.5) * s;
        if (rootRef.current) rootRef.current.style.transform = `translate(${shakeOffsetRef.current.x}px, ${shakeOffsetRef.current.y}px)`;
      }
      if (t < 1) {
        raf = requestAnimationFrame(loop);
      } else {
        setShowSpark(true);
        shakeRef.current = 5;
        trySound(() => sound.coinDrop());
        window.setTimeout(() => setShowSpark(false), 400);
        window.setTimeout(() => { shakeRef.current = 0; }, 220);
        // keep the rAF alive briefly to apply shake offsets
        raf = requestAnimationFrame(loop2);
      }
    };
    const loop2 = () => {
      if (shakeRef.current > 0) {
        const s = shakeRef.current;
        shakeOffsetRef.current.x = (Math.random() - 0.5) * s;
        shakeOffsetRef.current.y = (Math.random() - 0.5) * s;
        if (rootRef.current) rootRef.current.style.transform = `translate(${shakeOffsetRef.current.x}px, ${shakeOffsetRef.current.y}px)`;
        raf = requestAnimationFrame(loop2);
      } else {
        if (rootRef.current) rootRef.current.style.transform = '';
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [coinDropping, reduced]);

  // ---------- loading bar smooth fill ----------
  useEffect(() => {
    if (reduced) return;
    if (phase !== 'progress' && phase !== 'flash' && phase !== 'ready') return;
    barStartRef.current = performance.now();
    const dur = T_PROGRESS_END - T_PROGRESS; // 900ms
    const step = (now: number) => {
      const t = Math.min(1, (now - barStartRef.current) / dur);
      const eased = 1 - Math.pow(1 - t, 2.4); // smooth ease-out
      if (barFillRef.current) barFillRef.current.style.transform = `translateX(${eased * 100 - 100}%)`;
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, reduced]);

  if (exit && phase === 'done') return null;

  const showInsert = phase === 'insert';
  const showBooting = phase === 'booting' || phase === 'progress';
  const showProgress = phase === 'progress' || phase === 'flash' || phase === 'ready';
  const showBar = phase === 'progress' || phase === 'flash';
  const showReady = phase === 'ready';

  return (
    <div
      ref={rootRef}
      className="boot-screen fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black"
      style={{
        opacity: exit ? 0 : 1,
        transition: 'opacity 0.35s ease-out',
        animation: 'boot-fade-in 0.5s ease-out both',
      }}
      aria-hidden
    >
      {/* CRT flicker + scanlines */}
      <div className="boot-flicker" data-on="true" />
      <div className="boot-scanlines" />

      {/* golden completion flash */}
      {showFlash && <div className="boot-gold-flash" />}

      {/* sparkle particles on READY */}
      {showSparkles && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {Array.from({ length: 8 }).map((_, i) => {
            const ang = (i / 8) * Math.PI * 2;
            const dist = 40 + (i % 3) * 12;
            return (
              <span
                key={i}
                className="boot-sparkle-particle"
                style={{
                  ['--sx' as string]: `${Math.cos(ang) * dist}px`,
                  ['--sy' as string]: `${Math.sin(ang) * dist}px`,
                  animationDelay: `${i * 0.03}s`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* coin + slot scene (insert phase) */}
      {(showInsert || coinDropping) && (
        <div className="relative flex flex-col items-center" style={{ marginBottom: 60 }}>
          {/* floating / dropping coin */}
          <div
            ref={coinRef}
            className={coinDropping ? '' : 'boot-coin-idle'}
            style={{
              transition: 'opacity 0.08s linear',
            }}
          >
            <PixelSprite grid={COIN_FRONT} palette={PALETTE} pixel={3} scale={2.2} />
          </div>

          {/* spark on coin entering slot */}
          {showSpark && (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <span
                  key={i}
                  className="boot-spark"
                  style={{
                    left: `${44 + (i - 1.5) * 10}px`,
                    animationDelay: `${i * 0.02}s`,
                  }}
                />
              ))}
            </>
          )}

          {/* the coin slot — sits below the coin's drop path */}
          <div className={`boot-slot mt-8 ${slotGlow ? 'boot-slot-glow' : ''}`} />
        </div>
      )}

      {/* INSERT COIN — blinks every 500ms */}
      {showInsert && (
        <div
          className="boot-text boot-blink font-pixel text-gold text-center"
          style={{ fontSize: 'clamp(0.7rem, 2.6vw, 1.2rem)', marginTop: 8 }}
        >
          INSERT COIN
        </div>
      )}

      {/* BOOTING ARCADE SYSTEM... typewriter */}
      {showBooting && (
        <BootText text="BOOTING ARCADE SYSTEM..." />
      )}

      {/* progress lines */}
      {showProgress && (
        <div className="boot-lines font-pixel mt-5" style={{ fontSize: 'clamp(0.5rem, 1.6vw, 0.7rem)' }}>
          {PROGRESS_LINES.map((_, i) => (
            <div key={i} className="boot-line" style={{ minHeight: '1.6em' }}>
              <span style={{ visibility: typedLines[i] ? 'visible' : 'hidden' }}>
                {typedLines[i] || '\u00A0'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* loading bar — transform-based fill (no width animation) */}
      {showBar && (
        <div className="boot-bar-wrap pixel-border mt-5">
          <div
            ref={barFillRef}
            className="boot-bar-fill h-full bg-gold"
            style={{
              width: '100%',
              transform: 'translateX(-100%)',
            }}
          />
        </div>
      )}

      {/* READY! */}
      {showReady && (
        <div
          className="boot-ready font-pixel text-gold text-center"
          style={{
            fontSize: 'clamp(1.2rem, 5vw, 2.4rem)',
            textShadow: '0 0 12px rgba(255,210,63,0.7), 3px 3px 0 #1a1530',
          }}
        >
          READY!
        </div>
      )}
    </div>
  );
}

/** Typewriter helper: reveals `text` one char at a time, calls back with current output. */
function typewrite(text: string, cb: (out: string) => void) {
  let i = 0;
  const step = () => {
    i++;
    cb(text.slice(0, i));
    if (i < text.length) window.setTimeout(step, 32);
  };
  step();
}

/** Typewriter text component for the BOOTING line. */
function BootText({ text }: { text: string }) {
  const [out, setOut] = useState('');
  useEffect(() => {
    let i = 0;
    let cancelled = false;
    const step = () => {
      if (cancelled) return;
      i++;
      setOut(text.slice(0, i));
      if (i < text.length) window.setTimeout(step, 45);
    };
    step();
    return () => { cancelled = true; };
  }, [text]);
  return (
    <div
      key={text}
      className="boot-text font-pixel text-gold text-center"
      style={{ fontSize: 'clamp(0.6rem, 2.2vw, 1rem)' }}
    >
      {out}
      <span className="animate-blink" style={{ animationDuration: '0.6s' }}>_</span>
    </div>
  );
}
