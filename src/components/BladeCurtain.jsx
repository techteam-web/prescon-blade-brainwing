import { useCallback } from 'react';
import { useApp } from '../app/appContext';

// Persistent transition furniture. Mounted once at app root, never unmounted, and
// animated only by the director — which is why these elements live here rather than
// inside any screen.
//
// There is exactly one page transition in this app: the cut. Its parts are the two
// halves and the seam between them. The halves are empty here and are filled at
// build time with clones of whichever screen is being sliced — see `theCut` in
// src/gsap/TransitionDirector.js.

export function BladeCurtain() {
  const { registerChrome } = useApp();

  const ref = useCallback((name) => (el) => registerChrome(name, el), [registerChrome]);

  return (
    <div className="pointer-events-none fixed inset-0 z-90" aria-hidden="true">
      {/* THE CUT. Two clipped halves of one page, and the lit seam between them. */}
      <div ref={ref('split')} className="blade-split">
        <div ref={ref('splitL')} className="blade-split-half" data-half="l" />
        <div ref={ref('splitR')} className="blade-split-half" data-half="r" />
        <div ref={ref('splitSeam')} className="blade-split-seam">
          <span ref={ref('splitGlow')} className="blade-split-seam-glow" />
          <span className="blade-split-seam-core" />
        </div>
      </div>

      {/* The intro strike: a line that draws from the centre, tilts to the blade angle
          and cuts. Runs once, on entry. */}
      <div ref={ref('introLine')} className="blade-intro-line" />
    </div>
  );
}
