import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks';

interface PixelTransitionProps {
  onComplete: () => void;
  duration?: number;
  tileSize?: number;
  startDelay?: number;
}

/**
 * PIXEL MOSAIC TRANSITION
 *
 * A dedicated transition layer that sits above the Hero and mimics the
 * BootScreen's dark arcade appearance. After the user clicks to enter,
 * the BootScreen hands off to this canvas, which then dissolves into
 * hundreds of square pixel tiles that disappear in a semi-random,
 * clustered order — revealing the Hero underneath one tile at a time.
 *
 * The dissolution uses random "seed" points; each tile's dissolve time
 * is based on its distance from the nearest seed, creating an organic,
 * spreading pattern that resembles an old pixel world loading in.
 *
 * Performance: the boot-screen appearance is rendered once to an
 * offscreen canvas. The main canvas draws that image once, then each
 * frame only erases newly-dead tiles via `destination-out` fillRect —
 * no full redraws, no DOM operations. GPU-accelerated drawImage +
 * fillRect only. Runs at 60 FPS.
 */
export function PixelTransition({
  onComplete,
  duration = 850,
  tileSize = 24,
  startDelay = 100,
}: PixelTransitionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) {
      onCompleteRef.current();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    // ---- offscreen canvas: replicate BootScreen appearance ----
    const off = document.createElement('canvas');
    off.width = canvas.width;
    off.height = canvas.height;
    const offCtx = off.getContext('2d');
    if (!offCtx) return;
    offCtx.scale(dpr, dpr);

    // solid black background (matches BootScreen bg-black)
    offCtx.fillStyle = '#000000';
    offCtx.fillRect(0, 0, w, h);

    // CRT vignette (matches .crt-overlay::after radial gradient)
    const vGrad = offCtx.createRadialGradient(
      w / 2, h / 2, 0,
      w / 2, h / 2, Math.max(w, h) * 0.7
    );
    vGrad.addColorStop(0.55, 'rgba(0,0,0,0)');
    vGrad.addColorStop(1, 'rgba(13,15,43,0.45)');
    offCtx.fillStyle = vGrad;
    offCtx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;

    // helper: clamp like CSS clamp(min, pref, max)
    const clamp = (min: number, pref: number, max: number) =>
      Math.max(min, Math.min(max, pref));

    // ---- progress lines (above center) ----
    const PROGRESS_LINES = [
      '✓ Loading Pixel World...',
      '✓ Connecting Token...',
      '✓ Initializing Mascot...',
      '✓ Loading Memes...',
      '✓ Preparing Moon Mission...',
      '✓ Ready.',
    ];
    const lineSize = clamp(8, w * 0.016, 11);
    offCtx.font = `${lineSize}px "Press Start 2P", monospace`;
    offCtx.fillStyle = 'rgba(255,210,63,0.85)';
    offCtx.textAlign = 'left';
    offCtx.textBaseline = 'middle';
    offCtx.shadowColor = 'rgba(255,210,63,0.4)';
    offCtx.shadowBlur = 6;
    const linesBlockH = PROGRESS_LINES.length * lineSize * 1.8;
    const linesX = (w - Math.min(280, w * 0.6)) / 2;
    let lineY = cy - linesBlockH / 2 - 40;
    for (const line of PROGRESS_LINES) {
      offCtx.fillText(line, linesX, lineY);
      lineY += lineSize * 1.8;
    }
    offCtx.shadowBlur = 0;

    // ---- loading bar (full, below progress lines) ----
    const barW = Math.min(280, w * 0.6);
    const barH = 14;
    const barX = (w - barW) / 2;
    const barY = lineY + 6;
    offCtx.fillStyle = '#0d0f2b';
    offCtx.fillRect(barX - 4, barY - 4, barW + 8, barH + 8);
    offCtx.fillStyle = '#ffd23f';
    offCtx.shadowColor = 'rgba(255,210,63,0.6)';
    offCtx.shadowBlur = 10;
    offCtx.fillRect(barX, barY, barW, barH);
    offCtx.shadowBlur = 0;

    // ---- SYSTEM READY (big golden text, centered) ----
    const readySize = clamp(19, w * 0.05, 38);
    offCtx.font = `${readySize}px "Press Start 2P", monospace`;
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    // hard shadow (3px 3px 0 #1a1530)
    offCtx.fillStyle = '#1a1530';
    offCtx.fillText('SYSTEM READY', cx + 3, cy + 45);
    // glow + main text
    offCtx.fillStyle = '#ffd23f';
    offCtx.shadowColor = 'rgba(255,210,63,0.7)';
    offCtx.shadowBlur = 12;
    offCtx.fillText('SYSTEM READY', cx, cy + 42);
    offCtx.shadowBlur = 0;

    // ---- CTA (cream text, below SYSTEM READY) ----
    const ctaSize = clamp(9, w * 0.02, 14);
    offCtx.font = `${ctaSize}px "Press Start 2P", monospace`;
    offCtx.fillStyle = '#f5ead3';
    offCtx.shadowColor = 'rgba(245,234,211,0.4)';
    offCtx.shadowBlur = 8;
    offCtx.fillText('► CLICK ANYWHERE TO ENTER THE ARCADE', cx, cy + 85);
    offCtx.shadowBlur = 0;

    // ---- CRT scanlines on top (matches .boot-scanlines) ----
    offCtx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let y = 3; y < h; y += 4) {
      offCtx.fillRect(0, y, w, 1);
    }

    // ---- tile grid ----
    const ts = Math.round(tileSize * dpr);
    const cols = Math.ceil(canvas.width / ts);
    const rows = Math.ceil(canvas.height / ts);
    const totalTiles = cols * rows;

    interface Tile {
      dissolveAt: number;
      dead: boolean;
    }
    const tiles: Tile[] = new Array(totalTiles);
    for (let i = 0; i < totalTiles; i++) {
      tiles[i] = { dissolveAt: 0, dead: false };
    }

    // ---- organic dissolution: seed points spread outward ----
    // Fewer seeds = more visible clustering. Tiles near a seed dissolve
    // earlier; the wave spreads outward with per-tile randomness.
    const numSeeds = w < 640 ? 5 : 8;
    const seeds: { x: number; y: number; time: number }[] = [];
    for (let i = 0; i < numSeeds; i++) {
      seeds.push({
        x: Math.random() * cols,
        y: Math.random() * rows,
        time: Math.random() * duration * 0.2,
      });
    }

    const maxDim = Math.max(cols, rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let earliest = Infinity;
        for (const s of seeds) {
          const dx = c - s.x;
          const dy = r - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const t = s.time + (dist / maxDim) * duration * 0.8;
          if (t < earliest) earliest = t;
        }
        tiles[r * cols + c].dissolveAt = Math.min(
          earliest + Math.random() * duration * 0.12,
          duration
        );
      }
    }

    // ---- animation loop ----
    let raf = 0;
    let startTime = 0;
    let firstDrawDone = false;

    const animate = (now: number) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime - startDelay;

      if (elapsed <= 0) {
        // delay period: show the full boot-screen snapshot
        if (!firstDrawDone) {
          ctx.drawImage(off, 0, 0);
          firstDrawDone = true;
        }
        raf = requestAnimationFrame(animate);
        return;
      }

      // erase newly-dead tiles (destination-out makes them transparent)
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000000';
      let allDead = true;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const t = tiles[r * cols + c];
          if (!t.dead && elapsed >= t.dissolveAt) {
            t.dead = true;
            ctx.fillRect(c * ts, r * ts, ts, ts);
          }
          if (!t.dead) allDead = false;
        }
      }
      ctx.globalCompositeOperation = 'source-over';

      if (allDead) {
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current();
        }
        return;
      }

      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
    };
  }, [reduced, duration, tileSize, startDelay]);

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
        zIndex: 10001,
        pointerEvents: 'none',
        imageRendering: 'pixelated',
        backgroundColor: '#000000',
      }}
    />
  );
}
