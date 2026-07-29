import { useState } from 'react';
import { UiProvider } from '@/components/ui/UiProvider';
import { CRTOverlay } from '@/components/ui/CRTOverlay';
import { FireworkManager } from '@/components/ui/FireworkManager';
import { BootScreen } from '@/components/ui/BootScreen';
import { PixelTransition } from '@/components/ui/PixelTransition';
import { MascotJourney } from '@/components/ui/MascotJourney';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/sections/Hero';
import { CoinDash } from '@/sections/CoinDash';
import { About } from '@/sections/About';
import { Tokenomics } from '@/sections/Tokenomics';
import { HowToBuy } from '@/sections/HowToBuy';
import { Roadmap } from '@/sections/Roadmap';
import { Community } from '@/sections/Community';
import { FAQ } from '@/sections/FAQ';
import { Footer } from '@/sections/Footer';

type BootState = 'booting' | 'transitioning' | 'ready';

function App() {
  const [bootState, setBootState] = useState<BootState>('booting');

  // Called immediately when the user clicks the boot screen — the Hero is
  // mounted underneath and the PixelTransition layer (a snapshot of the boot
  // screen) takes over visually, dissolving into tiles.
  const handleBootDone = () => {
    setBootState('transitioning');
  };

  // Called once the pixel-mosaic dissolve completes — now the Hero is fully
  // visible and its entrance animations (coin magnet cinematic, etc.) can
  // safely begin.
  const handleTransitionComplete = () => {
    setBootState('ready');
    window.dispatchEvent(new Event('bootscreen:finished'));
  };

  return (
    <UiProvider>
      <FireworkManager />
      {bootState === 'booting' && <BootScreen onDone={handleBootDone} />}
      {bootState === 'transitioning' && (
        <PixelTransition onComplete={handleTransitionComplete} />
      )}
      <div>
        <CRTOverlay />
        <MascotJourney />
        <a href="#top" className="skip-link">
          Skip to content
        </a>
        <Navbar />
        <main className="relative">
          <Hero />
          <CoinDash />
          <About />
          <Tokenomics />
          <HowToBuy />
          <Roadmap />
          <Community />
          <FAQ />
        </main>
        <Footer />
      </div>
    </UiProvider>
  );
}

export default App;
