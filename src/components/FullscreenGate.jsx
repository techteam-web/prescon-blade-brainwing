import { useRef } from 'react';
import { Wordmark } from './Wordmark';
import { Control } from './Primitives';
import { CloseIcon } from './Icons';
import { GATE } from '../data/content';
import { useApp } from '../app/appContext';
import { INITIAL_TARGET } from '../app/routes';
import { useFullscreen } from '../hooks/useFullscreen';
import { gsap, useGSAP, E } from '../gsap/Gsapconfig';

// The gate is a SIBLING of the frozen layer, never a descendant: `filter` creates a
// containing block for fixed descendants, so a blur on an ancestor would blur the gate
// along with the app it is supposed to sit above.
//
// Its own fade is a CSS transition rather than a GSAP tween, so it stays visible and
// interactive even while every GSAP animation in the app is paused.

export function FullscreenGate() {
  const { stage, goToLanding, navigate: go, setPaused } = useApp();
  const root = useRef(null);

  const { mode, request, showNote, dismissNote } = useFullscreen({
    onPause: () => setPaused(true),
    onResume: () => setPaused(false),
  });

  const first = stage === 'gate';
  const open = mode === 'prompt';

  // Entrance. Created after the freeze, so exportRoot() never captures it.
  useGSAP(
    () => {
      if (!open || !root.current) return;
      gsap.set(root.current.querySelectorAll('[data-gate-item]'), { autoAlpha: 0, y: 14 });
      gsap.to(root.current.querySelectorAll('[data-gate-item]'), {
        autoAlpha: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.07,
        ease: E.out,
      });
    },
    { dependencies: [open], scope: root },
  );

  const onEnter = async () => {
    await request();
    if (!first) return; // a later grant just returns to where we were
    // Honour a deep link. Someone who opened /location asked for the map, not the
    // landing — and the landing's intro would take the navigation lock for four
    // seconds, so this has to be the first move rather than a follow-up.
    const t = INITIAL_TARGET;
    if (t && t.stage !== 'landing') go(t.section ? t.section : { stage: t.stage });
    else goToLanding();
  };

  if (mode === 'fallback') {
    if (first) {
      // The API is unavailable. Do not trap the user behind an unsatisfiable prompt —
      // fall through to a locked 100dvh layout immediately, on the requested page.
      queueMicrotask(() => {
        const t = INITIAL_TARGET;
        if (t && t.stage !== 'landing') go(t.section ? t.section : { stage: t.stage });
        else goToLanding();
      });
    }
    return showNote ? (
      <div className="glass fixed bottom-[var(--screen-margin)] left-1/2 z-[200] flex -translate-x-1/2 items-center gap-[1.2em] px-[1.4em] py-[0.8em]">
        <span className="text-caption text-blade-cream/85">{GATE.unsupported}</span>
        <button
          type="button"
          onClick={dismissNote}
          aria-label="Dismiss"
          className="text-blade-copper"
        >
          <CloseIcon size="1.1em" />
        </button>
      </div>
    ) : null;
  }

  return (
    <div
      ref={root}
      id="gate"
      role="dialog"
      aria-modal="true"
      aria-label={first ? GATE.enter : GATE.resume}
      className="fixed inset-0 z-[200] grid place-items-center bg-blade-black"
      style={{
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div className="flex flex-col items-center gap-[2.4em]">
        <span data-gate-item>
          <Wordmark className="w-[clamp(11rem,22vw,26rem)]" />
        </span>
        <span
          data-gate-item
          aria-hidden="true"
          className="block h-px w-[clamp(6rem,12vw,14rem)] bg-blade-ink"
        />
        <span data-gate-item>
          <Control onClick={onEnter}>{first ? GATE.enter : GATE.resume}</Control>
        </span>
      </div>
    </div>
  );
}
