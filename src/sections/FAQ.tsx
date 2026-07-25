import { useState } from 'react';
import { Reveal } from '@/components/ui/Reveal';
import { PixelSprite } from '@/components/sprites/PixelSprite';
import { COIN_FRONT, PALETTE } from '@/components/sprites/sprites';
import { sound } from '@/utils/sound';
import { HillDivider } from '@/components/ui/HillDivider';

const FAQS = [
  {
    q: 'Is this financial advice?',
    a: "Absolutely not. This is a pixel coin that lives in a meadow. It cannot give you financial advice, and neither can we. We can barely give it snacks.",
  },
  {
    q: 'What is the utility?',
    a: "You can pet it. It blinks at you. Sometimes it says 'gm.' That's the utility. If you were expecting a whitepaper, the meadow is the wrong place.",
  },
  {
    q: 'When moon?',
    a: "The coin doesn't know what a moon is. It likes the sun better. But we're rooting for you, ser.",
  },
  {
    q: 'Is the liquidity locked?',
    a: "Yes — locked for 365 days and ownership is renounced. No sneaky stuff. The meadow is a safe place.",
  },
  {
    q: 'How do I get started?',
    a: "Scroll up to 'How To Buy.' Four steps. If the coin can do it, so can you. It doesn't even have hands.",
  },
  {
    q: 'Can I lose money?',
    a: "Yes. This is a meme coin, not a savings account. Only put in what you'd spend on snacks, and please touch grass regularly.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="grain-overlay relative bg-gradient-to-b from-sky-400 to-sky-300 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4">
        <Reveal className="text-center">
          <p className="pixel-label mb-3">// FAQ</p>
          <h2 className="font-pixel text-xl pixel-heading drop-shadow-[3px_3px_0_#1a1530] sm:text-2xl md:text-3xl">
            QUESTIONS &amp; SNACKS
          </h2>
        </Reveal>

        <div className="mt-10 space-y-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={f.q} delay={i * 60}>
                <div className="pixel-card overflow-hidden">
                  <button
                    onClick={() => {
                      setOpen(isOpen ? null : i);
                      sound.tap();
                    }}
                    className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="flex items-center gap-3">
                      <PixelSprite grid={COIN_FRONT} palette={PALETTE} pixel={2} className={isOpen ? 'animate-bob' : ''} />
                      <span className="font-body text-base font-semibold text-cream sm:text-lg">{f.q}</span>
                    </span>
                    <span
                      className="font-pixel text-gold"
                      style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform var(--dur-med) var(--ease-back)' }}
                    >
                      +
                    </span>
                  </button>
                  <div
                    className="grid"
                    style={{ gridTemplateRows: isOpen ? '1fr' : '0fr', transition: 'grid-template-rows var(--dur-med) var(--ease-out-soft)' }}
                  >
                    <div className="overflow-hidden">
                      <p className="px-4 pb-4 pl-12 font-body text-sm text-cream/85 sm:text-base">
                        {f.a}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>

      <HillDivider fromVar="--c-sky-mid" toVar="--c-sky-top" height={70} grassVar="--c-grass" className="mt-12" />
    </section>
  );
}
