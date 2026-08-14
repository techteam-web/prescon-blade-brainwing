import { useCallback, useRef, useState } from 'react';
import { gsap } from '../gsap/Gsapconfig';
import { useEventListener } from './useEventListener';

// LAW 2 — fullscreen only, re-prompted every time fullscreen is exited, state preserved.
//
// Vendor differences are normalised once at module scope.
const API = (() => {
  const d = typeof document === 'undefined' ? null : document;
  if (!d) return null;
  if ('fullscreenElement' in d) {
    return {
      el: 'fullscreenElement',
      enabled: 'fullscreenEnabled',
      req: 'requestFullscreen',
      exit: 'exitFullscreen',
      change: 'fullscreenchange',
    };
  }
  if ('webkitFullscreenElement' in d) {
    return {
      el: 'webkitFullscreenElement',
      enabled: 'webkitFullscreenEnabled',
      req: 'webkitRequestFullscreen',
      exit: 'webkitExitFullscreen',
      change: 'webkitfullscreenchange',
    };
  }
  return null;
})();

export const fullscreenSupported = !!API && !!document?.[API.enabled];

const NOTE_KEY = 'blade.fsNote';

export function useFullscreen({ onPause, onResume } = {}) {
  // 'native'   — fullscreen is available and in use
  // 'prompt'   — available, currently exited, gate should show
  // 'fallback' — unavailable or refused; never re-prompt
  const [mode, setMode] = useState(() => (fullscreenSupported ? 'prompt' : 'fallback'));
  const [noteDismissed, setNoteDismissed] = useState(
    () => typeof sessionStorage !== 'undefined' && sessionStorage.getItem(NOTE_KEY) === '1',
  );
  const frozen = useRef(null);

  const freeze = useCallback(() => {
    if (frozen.current) return;
    // exportRoot(), not globalTimeline.pause(): it lifts the animations that ALREADY
    // exist onto a detached timeline we pause, while animations created afterwards —
    // like the gate's own entrance — keep running. Pausing the global timeline would
    // freeze the gate along with the app it sits above.
    //
    // The second argument is `omitDelayedCalls`, and it defaults to TRUE. Left at the
    // default, the navigation watchdog keeps ticking behind the gate and force-settles
    // a transition the user has paused, skipping it to its end.
    frozen.current = gsap.exportRoot({}, false);
    frozen.current.pause();
    document.documentElement.dataset.frozen = 'true';
    onPause?.();
  }, [onPause]);

  const thaw = useCallback(() => {
    if (!frozen.current) return;
    delete document.documentElement.dataset.frozen;
    // The nav timeline continues from where it stopped, reaches onComplete, and releases
    // the navigation lock with no special handling.
    frozen.current.resume();
    frozen.current = null;
    onResume?.();
  }, [onResume]);

  const request = useCallback(async () => {
    if (!fullscreenSupported) {
      setMode('fallback');
      return;
    }
    try {
      await document.documentElement[API.req]({ navigationUI: 'hide' });
      setMode('native');
      thaw();
    } catch {
      // Feature detection is not enough: a permissions-policy-blocked iframe HAS
      // requestFullscreen and rejects at call time. Once here, never re-arm.
      setMode('fallback');
      thaw();
    }
  }, [thaw]);

  useEventListener(API?.change, () => {
    if (!API) return;
    const active = !!document[API.el];
    if (active) {
      setMode('native');
      thaw();
    } else {
      setMode((m) => (m === 'fallback' ? m : 'prompt'));
      freeze();
    }
  }, () => document);

  const dismissNote = useCallback(() => {
    setNoteDismissed(true);
    try {
      sessionStorage.setItem(NOTE_KEY, '1');
    } catch {
      /* private mode — the note simply shows again next session */
    }
  }, []);

  return {
    mode,
    request,
    supported: fullscreenSupported,
    showNote: mode === 'fallback' && !noteDismissed,
    dismissNote,
  };
}
