import { AppStateProvider } from './app/AppState';
import { Stage } from './app/Stage';
import { BladeCurtain } from './components/BladeCurtain';
import { TopRail } from './components/TopRail';
import { FullscreenGate } from './components/FullscreenGate';
import { KeyboardNav } from './app/KeyboardNav';

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
    </AppStateProvider>
  );
}
