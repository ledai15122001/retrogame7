import { useRef, useState, useCallback, useMemo } from 'react';
import { CoinDashGame, type GameHandle, type GameStatus } from '@/components/game/CoinDashGame';
import { PixelButton } from '@/components/ui/PixelButton';
import { Reveal } from '@/components/ui/Reveal';
import { HillDivider } from '@/components/ui/HillDivider';
import { sound } from '@/utils/sound';
import { useInViewOnce } from '@/hooks/useInViewOnce';

/**
 * COIN DASH — the playable arcade section.
 * Framed as a switched-on arcade cabinet: marquee on top, a scanline CRT
 * screen holding the canvas, a chassis HUD (score / best / misses / combo),
 * and a colored control-panel base with a START button and on-screen
 * touch controls for mobile (left / hop / right).
 */
export function CoinDash() {
  const gameRef = useRef<GameHandle | null>(null);
  const [status, setStatus] = useState<GameStatus>('ready');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [misses, setMisses] = useState(0);
  const [combo, setCombo] = useState(0);
  const { ref: cabRef, inView: cabOn } = useInViewOnce<HTMLDivElement>({ threshold: 0.3 });

  const callbacks = useMemo(
    () => ({
      onStatus: setStatus,
      onScore: setScore,
      onBest: setBest,
      onMisses: setMisses,
      onCombo: setCombo,
    }),
    []
  );

  const handleStart = useCallback(() => {
    sound.tap();
    gameRef.current?.start();
  }, []);

  const handlePauseToggle = useCallback(() => {
    if (status === 'playing') gameRef.current?.pause();
    else if (status === 'paused') gameRef.current?.resume();
  }, [status]);

  const hold = useCallback((dir: -1 | 0 | 1) => () => gameRef.current?.setMove(dir), []);

  return (
    <section id="arcade" className="grain-overlay relative bg-gradient-to-b from-sky-300 to-sky-200 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4">
        <Reveal className="text-center">
          <p className="pixel-label mb-3">// Arcade</p>
          <h2 className="font-pixel text-xl pixel-heading drop-shadow-[3px_3px_0_var(--ui-ink)] sm:text-2xl md:text-3xl">
            COIN DASH
          </h2>
          <p className="mx-auto mt-4 max-w-md font-body text-fg-85">
            The mascot isn't just decorating the page — it's the player.
            Catch falling coins. Dodge the spikes. Miss three and it's over.
          </p>
        </Reveal>

        {/* ---------- ARCADE CABINET ---------- */}
        <Reveal delay={120} className="mt-10">
          <div ref={cabRef} className={`arcade-cabinet mx-auto max-w-3xl ${cabOn ? 'arcade-on' : 'arcade-off'}`}>
            {/* marquee */}
            <div className="pixel-border relative flex items-center justify-center gap-3 bg-gradient-to-b from-pink to-pink-dark px-4 py-3 text-white">
              <span className="font-pixel text-[0.7rem] sm:text-[0.9rem] drop-shadow-[2px_2px_0_var(--ui-ink)]">
                COIN DASH
              </span>
              <span className="font-pixel text-[0.45rem] text-cream/80 sm:text-[0.55rem]">
                INSERT 0 SOL
              </span>
              {/* marquee bulbs */}
              <div className="absolute left-2 top-1/2 flex -translate-y-1/2 gap-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <span key={i} className="arcade-bulb h-1.5 w-1.5 bg-gold" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <span key={i} className="arcade-bulb h-1.5 w-1.5 bg-gold" style={{ animationDelay: `${i * 0.2 + 0.1}s` }} />
                ))}
              </div>
            </div>

            {/* CRT screen housing */}
            <div className="pixel-border relative bg-ink p-2 sm:p-3">
              {/* chassis HUD */}
              <div className="mb-2 flex items-stretch gap-2">
                <Hud label="SCORE" value={String(score)} color="text-gold" />
                <Hud label="BEST" value={String(best)} color="text-cyan" />
                <Hud label="COMBO" value={`x${combo}`} color="text-pink" />
                <Hud label="MISS" value={`${misses}/3`} color={misses >= 2 ? 'text-pink' : 'text-fg-70'} />
              </div>

              {/* the screen (canvas) */}
              <div
                className="arcade-screen relative overflow-hidden bg-black"
                style={{ aspectRatio: '8 / 5' }}
              >
                <CoinDashGame ref={gameRef} callbacks={callbacks} />
                {/* power-on flash */}
                <div className="arcade-powerflash pointer-events-none absolute inset-0" aria-hidden />
                {/* scanlines on the screen */}
                <div
                  className="arcade-scanlines pointer-events-none absolute inset-0 opacity-40"
                  style={{
                    background:
                      'repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(0,0,0,0.25) 3px, rgba(0,0,0,0.25) 4px)',
                  }}
                  aria-hidden
                />
                {/* CRT vignette */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6)' }}
                  aria-hidden
                />
              </div>
            </div>

            {/* control panel */}
            <div className="pixel-border flex flex-col items-center gap-3 bg-gradient-to-b from-purple-dark to-purple p-4 sm:flex-row sm:justify-between">
              {/* touch d-pad (mobile) */}
              <div className="flex items-center gap-2 sm:hidden">
                <TouchBtn label="◄" onDown={hold(-1)} onUp={hold(0)} />
                <TouchBtn label="HOP" big onDown={() => gameRef.current?.hop()} />
                <TouchBtn label="►" onDown={hold(1)} onUp={hold(0)} />
              </div>

              {/* action buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {status === 'playing' || status === 'paused' ? (
                  <PixelButton variant="cyan" onClick={handlePauseToggle} silent>
                    {status === 'paused' ? 'RESUME' : 'PAUSE'}
                  </PixelButton>
                ) : (
                  <PixelButton variant="gold" onClick={handleStart} className="px-5">
                    {status === 'over' ? 'RETRY' : 'START'}
                  </PixelButton>
                )}
              </div>

              {/* desktop controls hint */}
              <div className="hidden text-right font-pixel text-[0.45rem] text-cream/70 sm:block">
                <p>← → / A D · MOVE</p>
                <p className="mt-1">SPACE · HOP</p>
                <p className="mt-1">P / ESC · PAUSE</p>
              </div>
            </div>

            {/* cabinet feet */}
            <div className="mx-auto flex max-w-[80%] justify-between">
              <div className="h-3 w-8 bg-ink" />
              <div className="h-3 w-8 bg-ink" />
            </div>
          </div>
        </Reveal>

        {/* mobile controls hint */}
        <p className="mt-5 text-center font-pixel text-[0.45rem] text-fg-60 sm:hidden">
          DRAG TO MOVE · TAP TO HOP
        </p>
      </div>

      <HillDivider fromVar="--c-sky-mid" toVar="--c-hill-near" height={70} className="mt-12" />
    </section>
  );
}

function Hud({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="pixel-inset flex flex-1 flex-col items-center justify-center bg-ink/60 px-1 py-1.5">
      <span className="font-pixel text-[0.4rem] text-cream/60">{label}</span>
      <span className={`mt-1 font-pixel text-[0.7rem] ${color} sm:text-[0.8rem]`}>{value}</span>
    </div>
  );
}

function TouchBtn({
  label,
  onDown,
  onUp,
  big = false,
}: {
  label: string;
  onDown: () => void;
  onUp?: () => void;
  big?: boolean;
}) {
  return (
    <button
      className={`pixel-btn pixel-btn-gold flex select-none items-center justify-center font-pixel ${
        big ? 'h-14 w-20 text-[0.6rem]' : 'h-14 w-14 text-sm'
      }`}
      onPointerDown={(e) => {
        e.preventDefault();
        onDown();
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        onUp?.();
      }}
      onPointerLeave={() => onUp?.()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}
