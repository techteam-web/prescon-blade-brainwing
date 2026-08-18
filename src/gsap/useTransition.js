// The navigation machinery: render list, the lock, timeline lifecycle, and the swap.
//
// The load-bearing idea is that the swap is IMPERATIVE and in-frame, while React's
// unmount is lagging cleanup of an already-invisible node. Correctness therefore never
// depends on React flushing inside a GSAP tick, which is why there is no flushSync here
// (re-entering React from the ticker can stall it).

import { useCallback, useRef, useState } from 'react';
import { gsap, useGSAP } from './Gsapconfig';
import { buildTransition, captureFlip } from './TransitionDirector';

const entry = (stage, section, token) => ({
  key: `${section ?? stage}@${token}`,
  stage,
  section,
  token,
});

export function useTransition({ stage: initialStage = 'gate' } = {}) {
  const stageRef = useRef(null);
  const chromeRef = useRef({});
  const screensRef = useRef(new Map());

  const navRef = useRef(null);
  const lockRef = useRef(false); // synchronous — state batching makes state useless here
  const pausedRef = useRef(false);
  const tokenRef = useRef(0);
  const swapDoneRef = useRef(-1);

  const [view, setView] = useState(() => ({
    stage: initialStage,
    section: null,
    prevSection: null,
    token: 0,
    renderList: [entry(initialStage, null, 0)],
  }));
  // A mirror of lockRef purely so the UI can grey out controls. Never read for guarding.
  const [isTransitioning, setIsTransitioning] = useState(false);

  const registerScreen = useCallback((key, el) => {
    if (!el) return undefined;
    screensRef.current.set(key, el);
    return () => screensRef.current.delete(key);
  }, []);

  const registerChrome = useCallback((name, el) => {
    chromeRef.current[name] = el;
    return () => {
      if (chromeRef.current[name] === el) delete chromeRef.current[name];
    };
  }, []);

  /* ------------------------------------------------------------------- swap */

  const onSwap = useCallback(() => {
    const nav = navRef.current;
    if (!nav || swapDoneRef.current === nav.token) return; // idempotent
    swapDoneRef.current = nav.token;

    // (a) In this frame: the outgoing screen goes dark and surrenders its flip ids.
    // Two mounted screens would otherwise both match [data-flip-id="…"], and
    // display:none does not help because the attribute still exists.
    for (const [key, el] of screensRef.current) {
      if (key === nav.incomingKey) continue;
      gsap.set(el, { display: 'none', pointerEvents: 'none' });
      for (const n of el.querySelectorAll('[data-flip-id]')) {
        n.dataset.flipReleased = n.dataset.flipId;
        delete n.dataset.flipId;
      }
    }

    // (b) Deferred: React unmounts a node that is already invisible.
    setView((v) => (v.renderList.length > 1 ? { ...v, renderList: v.renderList.slice(-1) } : v));
  }, []);

  const settle = useCallback(
    (token, forced = false) => {
      const nav = navRef.current;
      if (!nav || nav.token !== token) return;
      nav.watchdog?.kill();
      if (forced) {
        nav.tl?.progress(1, true); // suppressEvents; we finish by hand
        onSwap();
      }
      setView((v) => (v.renderList.length > 1 ? { ...v, renderList: v.renderList.slice(-1) } : v));
      navRef.current = null;
      lockRef.current = false;
      setIsTransitioning(false);
      document.documentElement.removeAttribute('data-busy');
    },
    [onSwap],
  );

  /* --------------------------------------------------------------- navigate */

  const navigate = useCallback(
    (target, opts = {}) => {
      if (lockRef.current || pausedRef.current) return false; // HARD reject

      const to =
        typeof target === 'string'
          ? { stage: 'section', section: target }
          : { stage: target.stage, section: target.section ?? null };
      const from = { stage: view.stage, section: view.section };
      if (to.stage === from.stage && to.section === from.section) return false;

      lockRef.current = true;
      setIsTransitioning(true);
      document.documentElement.setAttribute('data-busy', 'true');

      const token = ++tokenRef.current;
      // Measure the old world synchronously, before React commits anything.
      const capture = captureFlip(from, to, chromeRef.current, opts);

      navRef.current = { token, from, to, opts, capture, tl: null, watchdog: null, incomingKey: null };

      setView((v) => ({
        stage: to.stage,
        section: to.section,
        prevSection: v.section,
        token,
        renderList: [...v.renderList, entry(to.stage, to.section, token)],
      }));

      // The URL is React Router's job — see src/app/RouteSync.jsx. The state machine
      // stays the source of truth for what is on screen; the router mirrors it, and
      // hands back the browser's back button and shareable deep links.
      return true;
    },
    [view.stage, view.section],
  );

  /* ------------------------------------------------------- build + play */

  useGSAP(
    () => {
      const nav = navRef.current;
      if (!nav || nav.token !== view.token || nav.tl) return undefined;

      const incoming = view.renderList.at(-1);
      nav.incomingKey = incoming.key;
      const inEl = screensRef.current.get(incoming.key);
      const outEl =
        view.renderList.length > 1 ? screensRef.current.get(view.renderList[0].key) : null;
      if (!inEl) return undefined;

      // will-change only for the duration of the transition.
      const staged = [inEl, outEl].filter(Boolean);
      gsap.set(staged, { willChange: 'transform, opacity, filter' });

      const tl = buildTransition({
        outEl,
        inEl,
        from: nav.from,
        to: nav.to,
        opts: nav.opts,
        chrome: chromeRef.current,
        capture: nav.capture,
        onSwap,
        onComplete: () => {
          gsap.set(staged, { willChange: 'auto' });
          settle(nav.token);
        },
      });
      nav.tl = tl;

      // gsap.delayedCall, not setTimeout: it lives on the GSAP timeline, so setPaused()
      // can freeze and resume it with the app when the fullscreen gate takes over. A
      // setTimeout would keep running behind the gate and force-settle a live nav,
      // skipping the transition the user paused.
      nav.watchdog = gsap.delayedCall(tl.duration() + 1.5, () => settle(nav.token, true));
      tl.play(0);

      return () => {
        // Runs on context revert — including React 19 StrictMode's synchronous
        // mount → cleanup → mount. Re-arming lets the second pass rebuild instead of
        // seeing a stale, killed timeline.
        nav.watchdog?.kill();
        nav.tl?.kill();
        nav.tl = null;
        swapDoneRef.current = -1;
      };
    },
    { dependencies: [view.token], scope: stageRef },
  );

  const setPaused = useCallback((value) => {
    pausedRef.current = value;
    // Pause the in-flight transition explicitly. gsap.exportRoot() should already have
    // captured it, but the gate is the only thing that can stop the app mid-transition
    // and it must not depend on that: a transition that advances behind the gate loses
    // frames the user paid attention to, and its watchdog can settle it early.
    const nav = navRef.current;
    if (!nav) return;
    if (value) {
      nav.tl?.pause();
      nav.watchdog?.pause();
    } else {
      nav.tl?.resume();
      nav.watchdog?.resume();
    }
  }, []);

  const forceSettle = useCallback(() => settle(tokenRef.current, true), [settle]);

  return {
    view,
    isTransitioning,
    navigate,
    registerScreen,
    registerChrome,
    stageRef,
    chromeRef,
    setPaused,
    forceSettle,
  };
}
