import { useEffect, useRef, useState } from 'react';
import { HeroCanvas } from '@/components/HeroCanvas';
import { Mascot } from '@/components/Mascot';
import { PixelButton } from '@/components/ui/PixelButton';
import { PixelSprite } from '@/components/sprites/PixelSprite';
import { COIN_FRONT, PALETTE } from '@/components/sprites/sprites';
import { useCopyState, useMouseLerp } from '@/hooks';
import { sound } from '@/utils/sound';
import { CoinMagnetCinematic } from '@/components/ui/CoinMagnetCinematic';

const CONTRACT = 'BUD5yD8mQK9pX2vN7rL4tZ3fW8hJ6cE1aF0sG7iU2oP';

export function Hero() {
  const { copied, copy } = useCopyState();
  const [, setBuyHover] = useState(false);
  const mouse = useMouseLerp();
  const mascotWrapRef = useRef<HTMLDivElement | null>(null);
  const coinLRef = useRef<HTMLDivElement | null>(null);
  const coinRRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);

  // gentle DOM parallax for mascot (22px) + corner coins (30px),
  // paused when the hero is off-screen. Composes with the cinematic's
  // squash transform on the inner [data-mascot] element.
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    let visible = true;
    let tabHidden = false;
    const io = new IntersectionObserver(
      (entries) => { visible = entries[0].isIntersecting; },
      { threshold: 0.01 }
    );
    io.observe(hero);
    const onVis = () => { tabHidden = document.hidden; };
    document.addEventListener('visibilitychange', onVis);
    let raf = 0;
    const loop = () => {
      if (visible && !tabHidden) {
        const mx = mouse.current.x;
        const my = mouse.current.y;
        if (mascotWrapRef.current) {
          mascotWrapRef.current.style.transform = `translate(${(mx * 22).toFixed(2)}px, ${(my * 22).toFixed(2)}px)`;
        }
        if (coinLRef.current) {
          coinLRef.current.style.transform = `translate(${(mx * 30).toFixed(2)}px, ${(my * 30).toFixed(2)}px)`;
        }
        if (coinRRef.current) {
          coinRRef.current.style.transform = `translate(${(mx * 30).toFixed(2)}px, ${(my * 30).toFixed(2)}px)`;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [mouse]);

  return (
    <section id="top" ref={heroRef} className="relative min-h-screen w-full overflow-hidden">
      <HeroCanvas />
      <CoinMagnetCinematic />

      {/* content */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 pt-28 pb-16 text-center">
        {/* title */}
        <h1 className="font-pixel text-cream drop-shadow-[4px_4px_0_#1a1530]">
          <span className="block text-2xl leading-tight sm:text-4xl md:text-5xl lg:text-6xl">
            <span className="text-gold animate-glow">$COIN</span>
            <span className="text-pink animate-glow" style={{ animationDelay: '0.8s' }}>BUDDY</span>
          </span>
        </h1>

        <p className="mt-5 max-w-xl font-body text-base text-cream/90 sm:text-lg md:text-xl">
          A tiny pixel coin with a big heart. Living in a little meadow
          you can poke, pet, and play with. Touch grass. Pet the coin.
          Number go up.
        </p>

        {/* mascot */}
        <div ref={mascotWrapRef} className="my-6 sm:my-8" style={{ willChange: 'transform' }}>
          <div data-mascot>
            <Mascot size={3.4} />
          </div>
        </div>

        {/* BUY + socials */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="#buy"
            onMouseEnter={() => {
              setBuyHover(true);
              sound.tap();
              window.dispatchEvent(new Event('mascot:buyHover'));
            }}
            onMouseLeave={() => setBuyHover(false)}
          >
            <PixelButton variant="gold" className="px-6 py-3 text-sm sm:text-base">
              BUY $COINBUDDY
            </PixelButton>
          </a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
            <PixelButton variant="cyan">TWITTER</PixelButton>
          </a>
          <a href="https://telegram.org" target="_blank" rel="noopener noreferrer">
            <PixelButton variant="purple">TELEGRAM</PixelButton>
          </a>
        </div>

        {/* contract address */}
        <div className="mt-8 w-full max-w-xl">
          <p className="pixel-label mb-2">Contract Address</p>
          <button
            onClick={() => {
              copy(CONTRACT);
              sound.copy();
            }}
            className="pixel-card group flex w-full items-center justify-between gap-2 px-3 py-3 text-left sm:px-4"
            aria-label="Copy contract address"
          >
            <span className="truncate font-pixel text-[0.55rem] text-cream sm:text-[0.7rem]">
              {CONTRACT}
            </span>
            <span
              className={`flex shrink-0 items-center gap-1 font-pixel text-[0.55rem] sm:text-[0.65rem] ${
                copied ? 'text-grass-light' : 'text-gold'
              }`}
            >
              {copied ? 'COPIED!' : 'COPY'}
            </span>
          </button>
        </div>

        {/* scroll hint */}
        <div className="mt-10 flex flex-col items-center gap-1 text-cream/60">
          <span className="font-pixel text-[0.5rem]">SCROLL TO EXPLORE</span>
          <PixelSprite
            grid={['  k  ', '  k  ', '  k  ', ' kkk ', 'kkkkk', ' kkk ', '  k  ']}
            palette={PALETTE}
            pixel={3}
            className="animate-bob"
          />
        </div>
      </div>

      {/* decorative spinning coins in corners */}
      <div ref={coinLRef} className="pointer-events-none absolute left-4 top-24 hidden sm:block" style={{ willChange: 'transform' }}>
        <PixelSprite grid={COIN_FRONT} palette={PALETTE} pixel={3} className="animate-bob coin-shimmer coin-sparkle" />
      </div>
      <div ref={coinRRef} className="pointer-events-none absolute right-6 top-32 hidden sm:block" style={{ willChange: 'transform' }}>
        <PixelSprite grid={COIN_FRONT} palette={PALETTE} pixel={3} className="animate-floaty coin-shimmer coin-sparkle" style={{ ['--sparkle-delay' as string]: '2.4s' }} />
      </div>
    </section>
  );
}
