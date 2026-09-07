import { AppStateProvider } from './app/AppState';
import { Stage } from './app/Stage';
import { BladeCurtain } from './components/BladeCurtain';
import { TopRail } from './components/TopRail';
import { FullscreenGate } from './components/FullscreenGate';
import { KeyboardNav } from './app/KeyboardNav';
import { RouteSync } from './app/RouteSync';

// #frozen-layer holds everything the fullscreen gate blurs. The gate is its sibling,
// never a descendant — see FullscreenGate.jsx.
export default function App() {
  return (
    <AppStateProvider>
      <div id="frozen-layer" className="absolute inset-0 overflow-hidden">
        <Stage />
        <TopRail />
        <BladeCurtain />
      </div>
      <FullscreenGate />
      <KeyboardNav />
      <RouteSync />
      <img
            src="/assets/Brainwinglogo/Brainwing-logo.webp"
            alt="Brainwing"
            className="fixed bottom-3 right-3 w-42 z-2 pointer-events-none opacity-95
             sm:bottom-4 sm:right-4 sm:w-42
             md:bottom-5 md:right-5 md:w-48
             lg:bottom-2 lg:right-6 lg:w-56
             xl:bottom-3 xl:right-7 xl:w-58
             2xl:bottom-4 2xl:right-8 2xl:w-64
             3xl:bottom-5 3xl:right-10 3xl:w-60
             4xl:bottom-12 4xl:right-12 4xl:w-70
             5xl:bottom-16 5xl:right-16 5xl:w-86
             6xl:bottom-20 6xl:right-20 6xl:w-100"
          />
    </AppStateProvider>
  );
}
