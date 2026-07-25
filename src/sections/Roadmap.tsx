import { Reveal } from '@/components/ui/Reveal';
import { PixelSprite } from '@/components/sprites/PixelSprite';
import { COIN_FRONT, TREE, SHROOM, HEART, PALETTE } from '@/components/sprites/sprites';
import { HillDivider } from '@/components/ui/HillDivider';

const CLOUD_GRID = ['   ccc     ', '  ccCCCcc  ', ' ccCCCCCccc', 'ccCCCCCCCCCc', ' cCCCCCCCCc ', '  cCCCCCCc  '];
const CLOUD_PAL = { c: '#f5ead3', C: '#d8c9a6' };
const HEART_PAL = { x: '#ff5d8f' };

const LEVELS = [
  {
    level: 'LEVEL 1',
    title: 'The Meadow',
    items: ['Launch', 'Memes', 'Community'],
    icon: COIN_FRONT,
    iconPal: PALETTE,
    accent: 'text-grass-light',
    done: true,
  },
  {
    level: 'LEVEL 2',
    title: 'Trending',
    items: ['Trending', 'Listings', '1000 holders'],
    icon: TREE,
    iconPal: PALETTE,
    accent: 'text-cyan',
    done: false,
  },
  {
    level: 'LEVEL 3',
    title: 'Moon',
    items: ['Moon', 'World domination', 'Snacks'],
    icon: HEART,
    iconPal: HEART_PAL,
    accent: 'text-pink',
    done: false,
  },
];

export function Roadmap() {
  return (
    <section id="roadmap" className="grain-overlay relative bg-gradient-to-b from-grass-dark to-grass py-20 sm:py-28">
      {/* drifting clouds */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40" aria-hidden>
        <PixelSprite
          grid={CLOUD_GRID}
          palette={CLOUD_PAL}
          pixel={3}
          className="absolute animate-drift"
          style={{ top: '12%' }}
        />
        <PixelSprite
          grid={CLOUD_GRID}
          palette={CLOUD_PAL}
          pixel={3}
          className="absolute animate-drift"
          style={{ top: '22%', animationDelay: '14s', animationDuration: '52s' }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-4">
        <Reveal className="text-center">
          <p className="pixel-label mb-3">// Roadmap</p>
          <h2 className="font-pixel text-xl pixel-heading drop-shadow-[3px_3px_0_#1a1530] sm:text-2xl md:text-3xl">
            THE QUEST LOG
          </h2>
          <p className="mx-auto mt-4 max-w-md font-body text-cream/85">
            We don't do "phases." We do levels. Beat one, unlock the next.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {LEVELS.map((lvl, i) => (
            <Reveal key={lvl.level} delay={i * 120}>
              <div className="pixel-card relative flex h-full flex-col items-center gap-4 p-6 text-center">
                {/* level badge */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="pixel-border bg-gold px-3 py-1 font-pixel text-[0.6rem] text-ink">
                    {lvl.level}
                  </span>
                </div>

                <PixelSprite grid={lvl.icon} palette={lvl.iconPal} pixel={3} scale={1.4} className="mt-2 animate-bob" />

                <h3 className={`font-pixel text-lg ${lvl.accent} drop-shadow-[2px_2px_0_#1a1530]`}>
                  {lvl.title}
                </h3>

                <ul className="flex w-full flex-col gap-2">
                  {lvl.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-center justify-center gap-2 border-b-2 border-dashed border-cream/20 pb-2 font-body text-sm text-cream/90 last:border-0"
                    >
                      <span className={`font-pixel text-[0.55rem] ${lvl.done ? 'text-grass-light' : 'text-cream/50'}`}>
                        {lvl.done ? '[x]' : '[ ]'}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>

                {lvl.done && (
                  <span className="font-pixel text-[0.55rem] text-gold">CLEARED!</span>
                )}
              </div>
            </Reveal>
          ))}
        </div>

        {/* little shroom decoration */}
        <div className="pointer-events-none mt-10 flex justify-center" aria-hidden>
          <PixelSprite grid={SHROOM} palette={PALETTE} pixel={3} className="animate-sway" />
        </div>
      </div>

      <HillDivider fromVar="--c-grass" toVar="--c-mountain-near" height={70} grassVar="--c-grass-light" className="mt-10" />
    </section>
  );
}
