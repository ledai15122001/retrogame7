import { useEffect, useRef } from 'react';
import { useRaf, useWindowSize, useMouseLerp, usePrefersReducedMotion } from '@/hooks';
import { palette } from '@/utils/theme';

/**
 * Full-screen animated pixel landscape rendered on a canvas.
 * Layers (back to front): starfield, celestial body (moon/sun), clouds,
 * far mountains, near mountains, trees, rolling hills, foreground grass,
 * floating coins, birds, drifting fireflies/particles.
 *
 * Reads CSS custom properties every frame via palette(), so flipping
 * data-theme instantly re-skins the whole scene — no separate art.
 *
 * Everything is drawn with chunky pixels (internally rendered at low res
 * then scaled up with image-rendering: pixelated).
 */
const SCALE = 4; // each "pixel" = SCALE css px

interface Cloud {
  x: number;
  y: number;
  speed: number;
  w: number;
}
interface Bird {
  x: number;
  y: number;
  speed: number;
  flap: number;
}
interface Coin {
  x: number;
  y: number;
  baseY: number;
  phase: number;
  collected: boolean;
}
interface Firefly {
  x: number;
  y: number;
  phase: number;
  speed: number;
}

export function HeroCanvas({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { w, h } = useWindowSize();
  const mouse = useMouseLerp();
  const reduced = usePrefersReducedMotion();
  const visibleRef = useRef(true);

  const state = useRef({
    clouds: [] as Cloud[],
    birds: [] as Bird[],
    coins: [] as Coin[],
    fireflies: [] as Firefly[],
    t: 0,
    grassPhase: 0,
    initW: 0,
    initH: 0,
  });

  // (re)init actors when size changes — fewer actors on small screens
  useEffect(() => {
    const s = state.current;
    const vw = Math.max(320, w);
    const vh = Math.max(400, h);
    const isMobile = vw < 640;
    const isTablet = vw < 1024;
    s.initW = vw;
    s.initH = vh;
    const cloudCount = isMobile ? 2 : isTablet ? 3 : 5;
    s.clouds = Array.from({ length: cloudCount }, (_, i) => ({
      x: (i / cloudCount) * vw + Math.random() * 120,
      y: 40 + Math.random() * (vh * 0.32),
      speed: 0.15 + Math.random() * 0.25,
      w: 28 + Math.floor(Math.random() * 20),
    }));
    s.birds = Array.from({ length: isMobile ? 1 : 3 }, () => ({
      x: Math.random() * vw,
      y: 60 + Math.random() * (vh * 0.25),
      speed: 0.4 + Math.random() * 0.5,
      flap: Math.random() * Math.PI * 2,
    }));
    const coinCount = isMobile ? 3 : 7;
    s.coins = Array.from({ length: coinCount }, (_, i) => ({
      x: (i / coinCount) * vw + Math.random() * 80,
      baseY: vh * 0.4 + Math.random() * (vh * 0.25),
      y: 0,
      phase: Math.random() * Math.PI * 2,
      collected: false,
    }));
    s.coins.forEach((c) => (c.y = c.baseY));
    s.fireflies = Array.from({ length: isMobile ? 8 : isTablet ? 16 : 26 }, () => ({
      x: Math.random() * vw,
      y: vh * 0.2 + Math.random() * (vh * 0.5),
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.6,
    }));
  }, [w, h]);

  // pause the render loop when the canvas scrolls out of view
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => { visibleRef.current = entries[0].isIntersecting; },
      { threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useRaf((dt) => {
    if (!visibleRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = state.current;
    const vw = Math.max(320, w);
    const vh = Math.max(400, h);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const lowW = Math.floor(vw / SCALE);
    const lowH = Math.floor(vh / SCALE);

    if (canvas.width !== lowW * dpr || canvas.height !== lowH * dpr) {
      canvas.width = lowW * dpr;
      canvas.height = lowH * dpr;
      canvas.style.width = `${vw}px`;
      canvas.style.height = `${vh}px`;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    // read the live palette every frame so theme switches repaint instantly
    const p = palette();
    // lerped parallax multipliers (desktop): sky 4, clouds 8, mountains 12,
    // grass 16, mascot 22, foreground coins 30. mouse is normalized -1..1.
    const mx = mouse.current.x;
    const my = mouse.current.y;

    s.t += dt;
    if (!reduced) s.grassPhase += dt * 0.004;

    // ---------- sky gradient ----------
    const skyGrad = ctx.createLinearGradient(0, 0, 0, lowH);
    skyGrad.addColorStop(0, p.skyTop);
    skyGrad.addColorStop(0.4, p.skyMid);
    skyGrad.addColorStop(0.75, p.skyBottom);
    skyGrad.addColorStop(1, p.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, lowW, lowH);

    // ---------- stars (night only) ----------
    if (!p.isDay) {
      const starTime = s.t / 1000;
      for (let i = 0; i < 40; i++) {
        const sx = (i * 53) % lowW;
        const sy = (i * 29) % Math.floor(lowH * 0.55);
        const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(starTime * 1.5 + i));
        ctx.fillStyle = p.star;
        ctx.globalAlpha = tw * 0.9;
        ctx.fillRect(sx, sy, 1, 1);
      }
      ctx.globalAlpha = 1;
    }

    // ---------- celestial body: moon (night) or sun (day) ----------
    const cx = lowW - 60 - mx * 4;
    const cy = 36 + my * 4;
    if (p.isDay) {
      // sun glow
      ctx.fillStyle = p.celestialGlow;
      drawCircle(ctx, cx, cy, 14);
      ctx.fillStyle = p.celestial;
      drawCircle(ctx, cx, cy, 11);
    } else {
      // moon
      ctx.fillStyle = p.celestial;
      drawCircle(ctx, cx, cy, 10);
      ctx.fillStyle = p.celestialGlow;
      drawCircle(ctx, cx - 3, cy - 2, 8);
      // craters eat back to sky
      ctx.fillStyle = p.celestialCradle;
      ctx.fillRect(cx + 2, cy - 2, 4, 2);
      ctx.fillRect(cx - 4, cy + 2, 3, 2);
    }

    // ---------- clouds ----------
    s.clouds.forEach((c) => {
      if (!reduced) c.x += c.speed * (dt / 16);
      if (c.x > lowW + 40) c.x = -c.w - 10;
      drawCloud(ctx, c.x + mx * 8, c.y + my * 4, c.w, p);
    });

    // ---------- mountains ----------
    drawMountains(ctx, 0, lowH * 0.62, lowW, 34, p.mountainFar, mx * 12, p);
    drawMountains(ctx, 0, lowH * 0.7, lowW, 46, p.mountainNear, mx * 12, p);

    // ---------- trees ----------
    for (let i = 0; i < 8; i++) {
      const tx = (i * (lowW / 8) + (s.t * 0.003) % (lowW / 8)) - 10;
      const sway = reduced ? 0 : Math.sin(s.t / 1100 + i) * 1.5;
      drawTree(ctx, tx + mx * 16, lowH * 0.74, sway, p);
    }

    // ---------- rolling hills ----------
    drawHills(ctx, 0, lowH * 0.8, lowW, 24, p.hillFar, 0.1, s.grassPhase);
    drawHills(ctx, 0, lowH * 0.86, lowW, 28, p.hillNear, 0.16, s.grassPhase + 0.4);

    // ---------- floating coins ----------
    s.coins.forEach((c) => {
      if (c.collected) return;
      if (!reduced) {
        c.phase += dt * 0.003;
        c.y = c.baseY + Math.sin(c.phase) * 6;
        c.x += 0.12 * (dt / 16);
        if (c.x > lowW + 20) c.x = -20;
      }
      const frame = Math.floor((s.t / 120) % 8);
      const edge = frame === 2 || frame === 6;
      drawCoin(ctx, c.x + mx * 30, c.y, edge, p);
    });

    // ---------- birds ----------
    s.birds.forEach((b) => {
      if (!reduced) {
        b.x += b.speed * (dt / 16);
        b.flap += dt * 0.02;
        if (b.x > lowW + 20) b.x = -20;
      }
      drawBird(ctx, b.x + mx * 16, b.y, Math.sin(b.flap) > 0, p);
    });

    // ---------- foreground grass ----------
    drawGrass(ctx, 0, lowH - 14, lowW, reduced ? 0 : s.grassPhase, p);

    // ---------- flowers ----------
    for (let i = 0; i < 6; i++) {
      const fx = (i * (lowW / 6)) + 10;
      const col = i % 2 === 0 ? p.flower1 : p.flower2;
      drawFlower(ctx, fx + mx * 16, lowH - 20, col, p);
    }

    // ---------- fireflies / particles ----------
    s.fireflies.forEach((f) => {
      if (!reduced) {
        f.phase += dt * 0.004 * f.speed;
        f.x += Math.cos(f.phase) * 0.3;
        f.y += Math.sin(f.phase * 1.3) * 0.2;
        if (f.x < 0) f.x = lowW;
        if (f.x > lowW) f.x = 0;
      }
      const a = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(f.phase * 2));
      ctx.fillStyle = p.firefly;
      ctx.globalAlpha = a;
      ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1);
      ctx.globalAlpha = a * 0.3;
      ctx.fillRect(Math.round(f.x) - 1, Math.round(f.y), 3, 1);
      ctx.fillRect(Math.round(f.x), Math.round(f.y) - 1, 1, 3);
      ctx.globalAlpha = 1;
    });

    // ---------- burst particles (global firework overlay handles clicks) ----------
    // (removed — see FireworkManager)
  }, true);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 h-full w-full ${className}`}
      style={{ imageRendering: 'pixelated' }}
      aria-hidden
    />
  );
}

/* =================== drawing helpers (theme-aware) =================== */

function drawCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) ctx.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
    }
  }
}

function drawCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  p: { cloud: string; cloudShadow: string }
) {
  ctx.fillStyle = p.cloud;
  ctx.fillRect(x, y + 3, w, 5);
  ctx.fillRect(x + 3, y + 1, w - 6, 7);
  ctx.fillRect(x + 6, y, w - 12, 9);
  ctx.fillStyle = p.cloudShadow;
  ctx.fillRect(x, y + 7, w, 2);
  ctx.fillRect(x + 3, y + 8, w - 6, 1);
}

function drawMountains(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  peakH: number,
  color: string,
  offset: number,
  p: { mountainSnow: string }
) {
  ctx.fillStyle = color;
  const peaks = 4;
  const pw = w / peaks;
  for (let i = 0; i < peaks; i++) {
    const px = x + i * pw + offset * 0.1;
    for (let j = 0; j < peakH; j++) {
      const bw = (peakH - j) * 2;
      ctx.fillRect(Math.round(px + pw / 2 - bw / 2), Math.round(y - j), bw, 1);
    }
  }
  ctx.fillStyle = p.mountainSnow;
  for (let i = 0; i < peaks; i++) {
    const px = x + i * pw + offset * 0.1;
    for (let j = peakH - 5; j < peakH; j++) {
      const bw = (peakH - j) * 2;
      ctx.fillRect(Math.round(px + pw / 2 - bw / 2), Math.round(y - j), bw, 1);
    }
  }
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sway: number,
  p: { trunk: string; tree: string; treeLight: string }
) {
  ctx.fillStyle = p.trunk;
  ctx.fillRect(Math.round(x), Math.round(y), 3, 8);
  ctx.fillStyle = p.tree;
  for (let i = 0; i < 12; i++) {
    const bw = i < 6 ? i * 2 + 4 : (12 - i) * 2 + 4;
    ctx.fillRect(Math.round(x + 1 - bw / 2 + sway), Math.round(y - i), bw, 1);
  }
  ctx.fillStyle = p.treeLight;
  ctx.fillRect(Math.round(x - 2 + sway), Math.round(y - 8), 2, 1);
  ctx.fillRect(Math.round(x - 4 + sway), Math.round(y - 5), 2, 1);
}

function drawHills(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  amp: number,
  color: string,
  freq: number,
  phase: number
) {
  ctx.fillStyle = color;
  for (let px = 0; px < w; px++) {
    const hy = Math.round(y + Math.sin((px + phase * 60) * freq * 0.1) * amp);
    ctx.fillRect(x + px, hy, 1, 200);
  }
}

function drawGrass(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  phase: number,
  p: { grass: string; grassDark: string; grassLight: string }
) {
  ctx.fillStyle = p.grass;
  ctx.fillRect(x, y, w, 14);
  ctx.fillStyle = p.grassDark;
  ctx.fillRect(x, y + 10, w, 4);
  ctx.fillStyle = p.grassLight;
  for (let i = 0; i < w; i += 4) {
    const sway = Math.sin(phase + i * 0.3) * 1;
    ctx.fillRect(i + Math.round(sway), y - 3, 1, 3);
    ctx.fillRect(i + 2 + Math.round(sway), y - 2, 1, 2);
  }
}

function drawFlower(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  p: { grass: string; gold: string }
) {
  ctx.fillStyle = p.grass;
  ctx.fillRect(x, y, 1, 6);
  ctx.fillStyle = color;
  ctx.fillRect(x - 1, y, 3, 1);
  ctx.fillRect(x, y - 1, 1, 3);
  ctx.fillRect(x - 2, y + 1, 1, 1);
  ctx.fillRect(x + 2, y + 1, 1, 1);
  ctx.fillStyle = p.gold;
  ctx.fillRect(x, y, 1, 1);
}

function drawCoin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  edge: boolean,
  p: { gold: string; goldLight: string; goldDark: string; ink: string }
) {
  if (edge) {
    ctx.fillStyle = p.goldDark;
    ctx.fillRect(x, y, 2, 8);
    ctx.fillStyle = p.ink;
    ctx.fillRect(x - 1, y, 1, 8);
    ctx.fillRect(x + 2, y, 1, 8);
  } else {
    ctx.fillStyle = p.gold;
    ctx.fillRect(x, y, 8, 8);
    ctx.fillStyle = p.goldLight;
    ctx.fillRect(x + 1, y + 1, 6, 6);
    ctx.fillStyle = p.goldDark;
    ctx.fillRect(x, y + 6, 8, 2);
    ctx.fillRect(x + 6, y, 2, 8);
    ctx.fillStyle = p.ink;
    ctx.fillRect(x - 1, y, 1, 8);
    ctx.fillRect(x + 8, y, 1, 8);
    ctx.fillRect(x, y - 1, 8, 1);
    ctx.fillRect(x, y + 8, 8, 1);
    ctx.fillRect(x + 2, y + 3, 1, 1);
    ctx.fillRect(x + 5, y + 3, 1, 1);
    ctx.fillRect(x + 2, y + 5, 4, 1);
  }
}

function drawBird(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  flap: boolean,
  p: { ink: string }
) {
  ctx.fillStyle = p.ink;
  if (flap) {
    ctx.fillRect(x, y, 1, 1);
    ctx.fillRect(x + 1, y + 1, 1, 1);
    ctx.fillRect(x + 2, y, 1, 1);
  } else {
    ctx.fillRect(x, y + 1, 1, 1);
    ctx.fillRect(x + 1, y, 1, 1);
    ctx.fillRect(x + 2, y + 1, 1, 1);
  }
}
