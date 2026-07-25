import { useEffect, useRef } from 'react';
import { COIN_FRONT, COIN_SIDE, PALETTE } from '@/components/sprites/sprites';
import { usePrefersReducedMotion } from '@/hooks';

/**
 * GLOBAL FIREWORK MANAGER
 *
 * One full-viewport, pointer-events:none canvas overlay mounted near the root.
 * Listens for left-click (pointerdown) anywhere on the page and spawns a pixel
 * firework burst at the cursor. Max 5 simultaneous fireworks; completed ones
 * are reaped automatically. A single rAF loop animates everything; only canvas
 * draws happen (no DOM layout/reflow). Respects prefers-reduced-motion.
 *
 * The burst style is lifted verbatim from the old Hero-only canvas handler:
 * gold + pink pixels, upward bias, gravity, ~600ms life. Small random
 * variation is added in count, radius and color order. 15% of bursts also
 * pop a tiny spinning pixel coin.
 */

const PX = 4; // size of one "pixel" block in css px (matches old Hero SCALE)
const MAX_FIREWORKS = 5;
const COIN_CHANCE = 0.15;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface CoinPop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  life: number;
  maxLife: number;
  side: boolean;
}

interface Firework {
  particles: Particle[];
  coin: CoinPop | null;
}

const COLORS = ['#ffd23f', '#ff5d8f'];

export function FireworkManager() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = usePrefersReducedMotion();
  const fireworksRef = useRef<Firework[]>([]);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      sizeRef.current = { w, h, dpr };
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const spawn = (cx: number, cy: number) => {
      const fw: Firework = { particles: [], coin: null };
      // small variation in count + radius
      const count = 8 + Math.floor(Math.random() * 5); // 8..12
      const radius = 0.85 + Math.random() * 0.35; // 0.85..1.20
      // color order variation: occasionally lead with pink
      const colors = Math.random() < 0.5 ? [COLORS[0], COLORS[1]] : [COLORS[1], COLORS[0]];
      for (let i = 0; i < count; i++) {
        const col = colors[i % 2];
        fw.particles.push({
          x: cx,
          y: cy,
          vx: (Math.random() - 0.5) * 2 * PX * radius,
          vy: (Math.random() - 1) * 2 * PX * radius,
          life: 600,
          maxLife: 600,
          color: col,
          size: 1 + Math.floor(Math.random() * 2),
        });
      }
      // 15% chance: tiny spinning coin pop
      if (Math.random() < COIN_CHANCE) {
        const ang = Math.random() * Math.PI * 2;
        const spd = (0.6 + Math.random() * 0.5) * PX;
        fw.coin = {
          x: cx,
          y: cy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - PX * 0.6,
          rot: Math.random() * Math.PI * 2,
          vrot: (Math.random() - 0.5) * 0.02,
          life: 700,
          maxLife: 700,
          side: Math.random() > 0.5,
        };
      }
      const list = fireworksRef.current;
      list.push(fw);
      while (list.length > MAX_FIREWORKS) list.shift();
    };

    const onPointerDown = (e: PointerEvent) => {
      // ignore right-click / middle-click
      if (e.button !== 0) return;
      spawn(e.clientX, e.clientY);
    };
    window.addEventListener('pointerdown', onPointerDown, { passive: true });

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      const { w, h, dpr } = sizeRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);

      const list = fireworksRef.current;
      for (let fi = list.length - 1; fi >= 0; fi--) {
        const fw = list[fi];
        let alive = false;

        // particles
        for (let i = 0; i < fw.particles.length; i++) {
          const p = fw.particles[i];
          if (p.life <= 0) continue;
          alive = true;
          p.x += p.vx * (dt / 16);
          p.y += p.vy * (dt / 16);
          p.vy += 0.02 * PX * (dt / 16);
          p.life -= dt;
          const a = Math.max(0, p.life / p.maxLife);
          ctx.globalAlpha = a;
          ctx.fillStyle = p.color;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size * PX, p.size * PX);
        }
        ctx.globalAlpha = 1;

        // coin pop
        const c = fw.coin;
        if (c && c.life > 0) {
          alive = true;
          c.x += c.vx * (dt / 16);
          c.y += c.vy * (dt / 16);
          c.vy += 0.03 * PX * (dt / 16);
          c.rot += c.vrot * dt;
          c.life -= dt;
          const frame = Math.floor((c.rot / (Math.PI / 4)) % 8);
          const side = frame === 2 || frame === 6 ? !c.side : c.side;
          const a = Math.max(0, c.life / c.maxLife);
          ctx.globalAlpha = a;
          drawSpriteGrid(ctx, side ? COIN_SIDE : COIN_FRONT, c.x, c.y, PX * 0.6);
          ctx.globalAlpha = 1;
        }

        if (!alive) list.splice(fi, 1);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9998,
        imageRendering: 'pixelated',
      }}
    />
  );
}

/** Draws a character-grid sprite onto the canvas at (x,y) with a given pixel size. */
function drawSpriteGrid(
  ctx: CanvasRenderingContext2D,
  grid: string[],
  x: number,
  y: number,
  px: number
) {
  const map: Record<string, string> = {
    k: PALETTE.k, o: PALETTE.o, O: PALETTE.O, d: PALETTE.d, w: PALETTE.w,
    e: PALETTE.e, p: PALETTE.p,
  };
  const ox = Math.round(x - (grid[0].length * px) / 2);
  const oy = Math.round(y - (grid.length * px) / 2);
  for (let yy = 0; yy < grid.length; yy++) {
    const row = grid[yy];
    for (let xx = 0; xx < row.length; xx++) {
      const ch = row[xx];
      if (ch === ' ' || ch === '.') continue;
      const col = map[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(ox + xx * px, oy + yy * px, Math.ceil(px), Math.ceil(px));
    }
  }
}
