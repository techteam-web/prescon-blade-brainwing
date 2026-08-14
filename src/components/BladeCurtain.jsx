import { useCallback } from 'react';
import { useApp } from '../app/appContext';

// Persistent transition furniture. Mounted once at app root, never unmounted, and
// animated only by the director — which is why these elements live here rather than
// inside any screen.
//
// The curtain is oversized (inset -12vh -12vw) so the 12° skew can never expose a
// corner. If it ever drops frames on an iPad Pro, reduce SHARDS to 5 before touching
// any duration.
const SHARDS = 7;

export function BladeCurtain() {
  const { registerChrome } = useApp();

  const ref = useCallback((name) => (el) => registerChrome(name, el), [registerChrome]);

  return (
    <div className="pointer-events-none fixed inset-0 z-90" aria-hidden="true">
      {/* T1 — the blade sweep. */}
      <div ref={ref('curtain')} className="blade-curtain">
        {Array.from({ length: SHARDS }, (_, i) => (
          <div key={i} data-shard className="blade-shard" />
        ))}
      </div>

      {/* T2 — the panel that rises from below, its top edge skewed to 12° so it arrives
          as a blade edge, carrying a copper line that fades as it lands. */}
      <div ref={ref('risePanel')} className="blade-rise" />

      {/* T4 — the single copper line that survives the fold and becomes the menu's
          vertical rule. */}
      <div ref={ref('foldLine')} className="blade-fold-line" />

      {/* T6 — the line that draws from centre, skews to 12°, and strikes. */}
      <div ref={ref('introLine')} className="blade-intro-line" />
    </div>
  );
}
