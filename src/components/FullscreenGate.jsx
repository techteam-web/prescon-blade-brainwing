import { useRef } from 'react';
import { PresconLogo, Wordmark } from './Wordmark';
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
  //
  // The mark travels in from the left as it draws — DrawSVGPlugin runs each glyph's
  // own outline from 0% to 100%, ordered by each path's real x-position (not source
  // order, which the extraction doesn't guarantee), so the ink reads left-to-right
  // like a signature rather than a randomly-ordered flicker. Once every stroke is
  // drawn it crossfades to a solid fill under a soft copper bloom, then the rule
  // below draws itself the same way (a real <line>, not a scaled div) before the CTA
  // settles in.
  //
  // Deliberately NOT the landing intro's vertical strike-and-travel (introSequence in
  // TransitionDirector.js) — that plays again moments later once fullscreen is
  // granted, so repeating its exact trick here would read as the same beat twice.
  useGSAP(
    () => {
      if (!open || !root.current) return;
      const wrap = root.current.querySelector('[data-gate-mark]');
      if (!wrap) return;
      const marksNodeList = wrap.querySelectorAll('[data-wordmark-path]');
      const glow = root.current.querySelector('[data-gate-glow]');
      const line = root.current.querySelector('[data-gate-line]');
      const cta = root.current.querySelector('[data-gate-cta]');

      // Left-to-right by ON-SCREEN geometry, not DOM order and not getBBox() — each
      // glyph carries its own `transform="matrix(...)"` (see wordmark.svg), which
      // getBBox() reports BEFORE, so it can't be used to compare screen position.
      // getBoundingClientRect() resolves every transform, giving true left-to-right
      // order regardless of how the source SVG's paths happen to be sequenced.
      const marks = Array.from(marksNodeList).sort(
        (a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left,
      );

      gsap.killTweensOf([wrap, marks, glow, line, cta]);

      // A short throw, not a long glide: E.out's long-tail curve (see Gsapconfig.js)
      // resolves ~99% of ANY distance within the first ~10% of its duration, so a
      // bigger x here wouldn't read as a slower slide — just a bigger snap. The
      // sustained left-to-right read comes from the draw stagger below; this is a
      // quick, decisive arrival cue ahead of it.
      gsap.set(wrap, { x: -28, autoAlpha: 0 });
      gsap.set(marks, { drawSVG: '0%', fillOpacity: 0, strokeOpacity: 1 });
      gsap.set(glow, { autoAlpha: 0, scale: 0.85, transformOrigin: 'center center' });
      gsap.set(line, { drawSVG: '0%' });
      gsap.set(cta, { autoAlpha: 0, y: 14 });

      gsap
        .timeline()
        // The mark slides in while its strokes are still bare outlines — the motion
        // and the drawing read as one gesture instead of two separate beats.
        .to(wrap, { x: 0, autoAlpha: 1, duration: 1.2 }, 0)
        .to(
          marks,
          { drawSVG: '100%', duration: 1.3, stagger: { each: 0.045, from: 'start' } },
          0.25,
        )
        .to(glow, { autoAlpha: 1, scale: 1.15, duration: 0.9 }, '>-=0.4')
        .to(marks, { fillOpacity: 1, strokeOpacity: 0, duration: 0.7, stagger: 0.015 }, '<')
        .to(glow, { autoAlpha: 0, duration: 1.1, ease: E.in }, '>-=0.2')
        .to(line, { drawSVG: '100%', duration: 0.65 }, '<')
        .to(cta, { autoAlpha: 1, y: 0, duration: 0.6 }, '>-=0.25');
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
      <div
        className="pointer-events-none absolute inset-0"
        style={{ padding: 'var(--screen-margin)' }}
      >
        <div className="flex justify-end">
          <PresconLogo className="w-[clamp(2.1rem,2.9vw,3.7rem)]" />
        </div>
      </div>

      <div className="relative flex flex-col items-center gap-[2.4em]">
        <span data-gate-mark className="relative">
          <span
            aria-hidden="true"
            data-gate-glow
            className="pointer-events-none absolute inset-0 -z-10 blur-[48px]"
            style={{
              background: 'radial-gradient(closest-side, rgb(202 142 91 / 0.55), transparent 72%)',
            }}
          />
          <Wordmark gradient className="w-[clamp(15rem,32vw,36rem)]" />
        </span>
        {/* A real <line>, not a scaled div — so it can be drawn with DrawSVGPlugin the
            same way the mark above it is, rather than faking a "draw" with scaleX. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 100 2"
          preserveAspectRatio="none"
          className="block h-[2px] w-[clamp(6rem,12vw,14rem)] overflow-visible text-blade-copper"
        >
          <line
            data-gate-line
            x1="0"
            y1="1"
            x2="100"
            y2="1"
            stroke="currentColor"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span data-gate-cta>
          <Control onClick={onEnter}>{first ? GATE.enter : GATE.resume}</Control>
        </span>
      </div>
    </div>
  );
}
