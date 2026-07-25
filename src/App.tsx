import { useState } from 'react';
import { UiProvider } from '@/components/ui/UiProvider';
import { CRTOverlay } from '@/components/ui/CRTOverlay';
import { FireworkManager } from '@/components/ui/FireworkManager';
import { BootScreen } from '@/components/ui/BootScreen';
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

function App() {
  const [booted, setBooted] = useState(false);

  return (
    <UiProvider>
      <FireworkManager />
      {!booted && <BootScreen onDone={() => setBooted(true)} />}
      <div style={{ opacity: booted ? 1 : 0, transition: 'opacity 0.5s ease' }}>
        <CRTOverlay />
        <MascotJourney />
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
