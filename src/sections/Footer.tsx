import { useEffect, useRef } from 'react';
import { PixelSprite } from '@/components/sprites/PixelSprite';
import { COIN_FRONT, PALETTE } from '@/components/sprites/sprites';
import { useCopyState } from '@/hooks';
import { sound } from '@/utils/sound';
import { usePrefersReducedMotion } from '@/hooks';

const CONTRACT = 'BUD5yD8mQK9pX2vN7rL4tZ3fW8hJ6cE1aF0sG7iU2oP';

export function Footer() {
  const { copied, copy } = useCopyState();
  const reduced = usePrefersReducedMotion();

  const footerRef = useRef<HTMLElement | null>(null);
  const logoRef = useRef<HTMLAnchorElement | null>(null);
  const contractRef = useRef<HTMLButtonElement | null>(null);
  const glowRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (reduced) return;

    const footer = footerRef.current;
    const logo = logoRef.current;
    const contract = contractRef.current;
    const glow = glowRef.current;
    if (!footer || !logo || !contract || !glow) return;

    let raf = 0;
    let lastProgress = -1;
    let glowFired = false;
    let logoT = 0;
    let lastNow = performance.now();
    let visible = false;

    const io = new IntersectionObserver(
      (entries) => { visible = entries[0].isIntersecting; },
      { threshold: 0.01 }
    );
    io.observe(footer);

    const computeProgress = () => {
      const vh = window.innerHeight;
      const fr = footer.getBoundingClientRect();
      const footerH = fr.height || 1;
      return Math.max(0, Math.min(1, (vh - fr.top) / footerH));
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || !visible) { lastNow = now; return; }
      const dt = Math.min(now - lastNow, 50);
      lastNow = now;

      const progress = computeProgress();
      if (progress !== lastProgress) {
        lastProgress = progress;

        // ---- hill lift: 6-10px upward as footer reveals ----
        const lift = Math.min(1, progress * 1.25);
        const hillY = -lift * 8;
        const hillsWrap = document.getElementById('footer-hills-wrap');
        if (hillsWrap) {
          hillsWrap.style.transform = `translateY(${hillY.toFixed(2)}px)`;
          hillsWrap.style.willChange = 'transform';
        }

        // ---- contract glow sweep: fire once at ~50% ----
        if (!glowFired && progress >= 0.5) {
          glowFired = true;
          glow.classList.add('firing');
        }
      }

      // ---- logo idle float: 2-3px sine, infinite ----
      logoT += dt;
      const floatY = Math.sin(logoT * 0.0018) * 2.5;
      logo.style.transform = `translateY(${floatY.toFixed(2)}px)`;
      logo.style.willChange = 'transform';
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [reduced]);

  return (
    <footer
      ref={footerRef}
      className="relative bg-night py-14"
      style={{ willChange: reduced ? undefined : 'transform' }}
    >
      {/* grass strip on top */}
      <div className="absolute left-0 right-0 top-0 h-3 bg-grass" aria-hidden />

      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-center gap-6 text-center">
          <a
            ref={logoRef}
            href="#top"
            className="flex items-center gap-2"
            aria-label="$COINBUDDY home"
          >
            <PixelSprite grid={COIN_FRONT} palette={PALETTE} pixel={2} scale={1.5} className={reduced ? 'animate-bob' : ''} />
            <span className="font-pixel text-[0.8rem] text-gold">$COINBUDDY</span>
          </a>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-body text-sm font-medium text-cream/80 transition-colors hover:text-cyan"
            >
              Twitter
            </a>
            <span className="text-cream/30">·</span>
            <a
              href="https://telegram.org"
              target="_blank"
              rel="noopener noreferrer"
              className="font-body text-sm font-medium text-cream/80 transition-colors hover:text-purple-light"
            >
              Telegram
            </a>
            <span className="text-cream/30">·</span>
            <a
              href="https://dexscreener.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-body text-sm font-medium text-cream/80 transition-colors hover:text-gold"
            >
              DEX Chart
            </a>
          </div>

          <button
            ref={contractRef}
            onClick={() => {
              copy(CONTRACT);
              sound.copy();
            }}
            className="pixel-card px-4 py-2"
            aria-label="Copy contract address"
          >
            <span className="font-pixel text-[0.55rem] text-cream sm:text-[0.65rem]">
              {CONTRACT}
            </span>
            <span className={`ml-2 font-pixel text-[0.55rem] sm:text-[0.65rem] ${copied ? 'text-grass-light' : 'text-gold'}`}>
              {copied ? 'COPIED!' : 'COPY'}
            </span>
            <span
              ref={glowRef}
              className="footer-glow-sweep-overlay"
              aria-hidden
              style={{ display: 'none' }}
            />
          </button>

          <p className="max-w-md font-body text-xs text-cream/50">
            $COINBUDDY is a meme coin with no intrinsic value. Not financial
            advice. Please touch grass. Pet the coin. Be kind.
          </p>

          <p className="font-pixel text-[0.5rem] text-cream/40">
            © {new Date().getFullYear()} THE MEADOW · MADE WITH PIXELS &amp; LOVE
          </p>
        </div>
      </div>
    </footer>
  );
}
