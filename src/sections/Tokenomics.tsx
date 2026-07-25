import { Reveal } from '@/components/ui/Reveal';
import { PixelSprite } from '@/components/sprites/PixelSprite';
import { COIN_FRONT, PALETTE, SHROOM } from '@/components/sprites/sprites';
import { HillDivider } from '@/components/ui/HillDivider';
import { useMemo } from 'react';

const CARDS = [
  { label: 'Total Supply', value: '1,000,000,000', note: 'one billion buddies', accent: 'text-gold' },
  { label: 'Tax', value: '0 / 0', note: 'buy tax / sell tax', accent: 'text-grass-light' },
  { label: 'Liquidity', value: 'LOCKED', note: 'locked for 365 days', accent: 'text-cyan' },
  { label: 'Ownership', value: 'RENOUNCED', note: 'no admin keys, ever', accent: 'text-pink' },
  { label: 'Burn', value: '30%', note: 'sent to the void', accent: 'text-purple-light' },
  { label: 'Market Cap', value: '???', note: 'you decide, ser', accent: 'text-gold' },
];

const SHROOM_PAL = { ...PALETTE };

export function Tokenomics() {
  return (
    <section id="tokenomics" className="grain-overlay relative bg-gradient-to-b from-forest to-forest-dark py-20 sm:py-28">
      {/* scattered coins bg */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30" aria-hidden>
        {Array.from({ length: 8 }).map((_, i) => (
          <PixelSprite
            key={i}
            grid={COIN_FRONT}
            palette={PALETTE}
            pixel={3}
            className="absolute animate-bob"
            style={{
              left: `${(i * 13) % 95}%`,
              top: `${(i * 27) % 80}%`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-6xl px-4">
        <Reveal className="text-center">
          <p className="pixel-label mb-3">// Tokenomics</p>
          <h2 className="font-pixel text-xl pixel-heading drop-shadow-[3px_3px_0_#1a1530] sm:text-2xl md:text-3xl">
            THE NUMBERS GO UP
          </h2>
          <p className="mx-auto mt-4 max-w-md font-body text-cream/80">
            Simple. Fair. No sneaky stuff. Here's where the buddies live.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <div className="pixel-card glow-ring group flex h-full flex-col items-center gap-2 p-5 text-center">
                <PixelSprite
                  grid={i % 3 === 0 ? COIN_FRONT : SHROOM}
                  palette={i % 3 === 0 ? PALETTE : SHROOM_PAL}
                  pixel={3}
                  className="transition-transform group-hover:animate-bob"
                />
                <p className="pixel-label mt-1">{c.label}</p>
                <p className={`font-pixel text-base sm:text-lg ${c.accent} drop-shadow-[2px_2px_0_#1a1530]`}>
                  {c.value}
                </p>
                <p className="font-body text-sm text-cream/70">{c.note}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <HillDivider fromVar="--c-hill-near" toVar="--c-sky-mid" height={70} className="mt-10" />
    </section>
  );
}
