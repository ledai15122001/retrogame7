import { useState, useEffect } from 'react';
import { PixelButton } from '@/components/ui/PixelButton';
import { PixelSprite } from '@/components/sprites/PixelSprite';
import { COIN_FRONT, PALETTE } from '@/components/sprites/sprites';
import { useUi } from '@/components/ui/UiProvider';
import { sound } from '@/utils/sound';

const LINKS = [
  { label: 'Arcade', href: '#arcade' },
  { label: 'About', href: '#about' },
  { label: 'Tokenomics', href: '#tokenomics' },
  { label: 'How To Buy', href: '#buy' },
  { label: 'Roadmap', href: '#roadmap' },
  { label: 'Community', href: '#community' },
  { label: 'FAQ', href: '#faq' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { soundOn, toggleSound, theme, toggleTheme } = useUi();

  useEffect(() => {
    let raf = 0;
    let pending = false;
    const onScroll = () => {
      if (pending) return;
      pending = true;
      raf = requestAnimationFrame(() => {
        pending = false;
        setScrolled(window.scrollY > 40);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <header className="fixed left-0 right-0 top-0 z-[1000] flex justify-center px-3 pt-3 sm:pt-4">
      <nav
        className={`flex w-full max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-5 sm:py-3 ${
          scrolled
            ? 'bg-sky-400/95 pixel-border backdrop-blur'
            : 'bg-sky-400/60 pixel-border backdrop-blur'
        }`}
        style={{ transition: 'background-color var(--dur-med) var(--ease-out-soft), box-shadow var(--dur-med) var(--ease-out-soft)' }}
      >
        {/* logo */}
        <a href="#top" className="flex items-center gap-2" aria-label="$COINBUDDY home">
          <PixelSprite
            grid={COIN_FRONT}
            palette={PALETTE}
            pixel={2}
            scale={1.4}
            className="animate-bob"
          />
          <span className="font-pixel text-[0.7rem] text-gold animate-glow sm:text-[0.8rem]">
            $COINBUDDY
          </span>
        </a>

        {/* desktop links */}
        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="font-body text-sm font-medium text-cream/90 transition-colors hover:text-gold"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* right actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="pixel-btn-ghost pixel-btn flex h-9 w-9 items-center justify-center p-0"
            style={{ fontSize: '0.9rem' }}
            aria-label={theme === 'night' ? 'Switch to day' : 'Switch to night'}
            title={theme === 'night' ? 'Night — switch to day' : 'Day — switch to night'}
          >
            {theme === 'night' ? '☾' : '☀'}
          </button>
          <button
            onClick={toggleSound}
            className="pixel-btn-ghost pixel-btn flex h-9 w-9 items-center justify-center p-0 text-base"
            style={{ fontSize: '0.9rem' }}
            aria-label={soundOn ? 'Mute sounds' : 'Unmute sounds'}
            title={soundOn ? 'Sound on' : 'Sound off'}
          >
            {soundOn ? '♪' : '×'}
          </button>
          <a href="#buy" className="hidden sm:block">
            <PixelButton variant="pink" className="hidden sm:inline-flex">
              BUY
            </PixelButton>
          </a>

          {/* mobile menu toggle */}
          <button
            className="pixel-btn pixel-btn-cyan flex h-9 w-10 items-center justify-center p-0 lg:hidden"
            onClick={() => {
              setOpen((o) => !o);
              sound.open();
            }}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <div className="flex flex-col gap-1">
              <span className={`block h-0.5 w-5 bg-ink ${open ? 'translate-y-1.5 rotate-45' : ''}`} style={{ transition: 'transform var(--dur-fast) var(--ease-back)' }} />
              <span className={`block h-0.5 w-5 bg-ink ${open ? 'opacity-0' : ''}`} style={{ transition: 'opacity var(--dur-fast) var(--ease-out-soft)' }} />
              <span className={`block h-0.5 w-5 bg-ink ${open ? '-translate-y-1.5 -rotate-45' : ''}`} style={{ transition: 'transform var(--dur-fast) var(--ease-back)' }} />
            </div>
          </button>
        </div>
      </nav>

      {/* mobile dropdown */}
      {open && (
        <div className="absolute left-3 right-3 top-[64px] z-[999] animate-popIn lg:hidden">
          <ul className="pixel-border flex flex-col gap-1 bg-sky-300/98 p-3 backdrop-blur">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 font-body text-base font-medium text-cream transition-colors hover:bg-sky-200/60 hover:text-gold"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li className="mt-1">
              <a href="#buy" onClick={() => setOpen(false)} className="block">
                <PixelButton variant="pink" className="w-full">
                  BUY $COINBUDDY
                </PixelButton>
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
