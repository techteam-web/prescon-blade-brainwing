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
            className="fixed bottom-3 right-3 w-30 z-2 pointer-events-none opacity-95
             sm:bottom-4 sm:right-4 sm:w-30
             md:bottom-5 md:right-5 md:w-35
             lg:bottom-2 lg:right-6 lg:w-40
             xl:bottom-3 xl:right-7 xl:w-42
             2xl:bottom-4 2xl:right-8 2xl:w-46
             3xl:bottom-5 3xl:right-10 3xl:w-44
             4xl:bottom-12 4xl:right-12 4xl:w-50
             5xl:bottom-16 5xl:right-16 5xl:w-62
             6xl:bottom-20 6xl:right-20 6xl:w-74"
          /> 
    </AppStateProvider>
  );
}
