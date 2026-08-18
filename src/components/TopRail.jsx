import { useCallback, useRef, useState } from 'react';
import { useApp } from '../app/appContext';
import { PresconLogo } from './Wordmark';
<<<<<<< HEAD
import { BackIcon, CompareIcon, CheckIcon } from './Icons';
import { gsap, useGSAP, D, E, prefersReducedMotion } from '../gsap/Gsapconfig';
=======
import { BackIcon, CompareIcon } from './Icons';
import { EnterPortal } from './Primitives';
import { gsap, useGSAP, D, E } from '../gsap/Gsapconfig';
>>>>>>> origin/main

// Present on every screen except the gate and the landing.
//
// Navigation lives TOP-LEFT, where the eye goes to get back. The Prescon lockup stays
// top-right as the fixed anchor: constant size and position, never animated on a page
// change.

function NavButton({ label, onClick, disabled, icon = false }) {
  const root = useRef(null);
  const { contextSafe } = useGSAP({ scope: root });

  const hover = contextSafe((on) => {
    const vars = { duration: D.micro, ease: E.soft, overwrite: 'auto' };
    gsap.to('[data-nav-rule]', { scaleX: on ? 1 : 0.4, ...vars });
    gsap.to('[data-nav-label]', { autoAlpha: on ? 1 : 0.6, ...vars });
    gsap.to('[data-nav-icon]', { x: on ? -3 : 0, ...vars });
  });

  return (
    <button
      ref={root}
      type="button"
      onClick={onClick}
      disabled={disabled}
      onPointerEnter={() => hover(true)}
      onPointerLeave={() => hover(false)}
      onFocus={() => hover(true)}
      onBlur={() => hover(false)}
      className="pointer-events-auto flex flex-col items-start gap-[0.45em] disabled:opacity-30"
    >
      <span className="flex items-center gap-[0.5em]">
        {icon ? (
          <span data-nav-icon className="block text-blade-copper">
            <BackIcon size="0.9em" />
          </span>
        ) : null}
        <span data-nav-label className="eyebrow opacity-60">{label}</span>
      </span>
      <span
        data-nav-rule
        aria-hidden="true"
        className="block h-px w-full origin-left scale-x-[0.4] bg-blade-copper"
      />
    </button>
  );
}

// The confirm flourish: a copper fill sweeps in left-to-right (echoing the hover-fill
// already used on the per-floor Compare toggles in Plans.jsx), the icon flips to a
// check, then it holds briefly before opening the compare panel and resetting.
function CompareButton({ count, onConfirm }) {
  const root = useRef(null);
  const [phase, setPhase] = useState('idle'); // idle | running | done
  const { contextSafe } = useGSAP({ scope: root });
  const disabled = count < 2;

  const run = contextSafe(() => {
    if (disabled || phase !== 'idle') return;

    if (prefersReducedMotion()) {
      onConfirm();
      return;
    }

    setPhase('running');
    gsap.fromTo(
      '[data-compare-fill]',
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: D.micro * 1.6,
        ease: E.out,
        onComplete: () => {
          setPhase('done');
          onConfirm();
          gsap.delayedCall(D.wipe, () => {
            gsap.to('[data-compare-fill]', {
              scaleX: 0,
              duration: D.micro,
              ease: E.in,
              onComplete: () => setPhase('idle'),
            });
          });
        },
      },
    );
  });

  const label = phase === 'done' ? 'Ready' : `Compare${count ? ` (${count})` : ''}`;

  return (
    <button
      ref={root}
      type="button"
      onClick={run}
      disabled={disabled || phase !== 'idle'}
      aria-label={`Compare selected floors${count ? `, ${count} selected` : ''}`}
      className="pointer-events-auto relative flex shrink-0 items-center gap-[0.5em] self-center overflow-hidden rounded-full border border-blade-copper px-[1.1em] py-[0.5em] text-caption uppercase tracking-[0.16em] text-blade-copper transition-opacity duration-200 disabled:opacity-30"
    >
      <span
        data-compare-fill
        aria-hidden="true"
        className="absolute inset-0 origin-left scale-x-0 bg-blade-copper"
      />
      <span
        className={`relative flex items-center gap-[0.5em] ${phase === 'done' ? 'text-blade-black' : ''}`}
      >
        {phase === 'done' ? <CheckIcon size="0.9em" /> : <CompareIcon size="0.9em" />}
        {label}
      </span>
    </button>
  );
}

export function TopRail() {
  const {
    stage,
    section,
    current,
    registerChrome,
    goToMenu,
    goToLanding,
    isTransitioning,
<<<<<<< HEAD
    compareIds,
    setCompareOpen,
=======
    compare,
    setCompare,
>>>>>>> origin/main
  } = useApp();
  // The director fades the whole rail out under the cut and back in with the destination,
  // so the rail never sits, unchanged, over a page that is coming apart.
  const railRef = useCallback((el) => registerChrome('rail', el), [registerChrome]);

  const visible = stage === 'menu' || stage === 'section';
  const caption = current?.caption ?? null;

  // The landing carries no rail — it IS home, so a HOME button there navigates nowhere.
  // This used to render the controls on every stage and merely mark them aria-hidden,
  // which left a live, clickable HOME sitting on the landing.
  if (!visible) return null;

  return (
    <div
      ref={railRef}
      className="pointer-events-none fixed inset-0 z-100"
      style={{ padding: 'var(--screen-margin)' }}
    >
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-[2em]">
          {/* The two places anyone ever wants to get back to. The section index is
              deliberately NOT here: it belongs to the menu, where it orders the list,
              and repeating it beside the controls made the rail read as a breadcrumb. */}
          <div className="flex min-w-0 items-start gap-[2.2em] max-sm:gap-[1.3em]">
            {stage === 'section' ? (
              <NavButton label="Menu" onClick={goToMenu} disabled={isTransitioning} icon />
            ) : null}
            <NavButton label="Home" onClick={goToLanding} disabled={isTransitioning} />
<<<<<<< HEAD
            {section === 'plans' ? (
              <CompareButton count={compareIds.length} onConfirm={() => setCompareOpen(true)} />
=======

            {/* Floor Plans only. The one screen with a second mode, so the one screen
                with a framed control — everything else in the rail is a label over a
                rule. The negative margin optically centres the box against the two-line
                nav buttons beside it. */}
            {stage === 'section' && section === 'plans' ? (
              <EnterPortal
                size="sm"
                icon={<CompareIcon size="1.15em" />}
                disabled={isTransitioning || compare === 'closing'}
                onClick={() => setCompare(compare === 'off' ? 'picking' : 'closing')}
                className="pointer-events-auto -mt-[0.55em] shrink-0"
              >
                {compare === 'off' ? 'Comparison' : 'Exit Compare'}
              </EnterPortal>
>>>>>>> origin/main
            ) : null}
          </div>

          <PresconLogo className="w-[clamp(3.4rem,4.6vw,6rem)] shrink-0" />
        </div>

        <div className="flex items-end justify-end gap-[2em]">
          {caption ? <span className="text-caption text-[#EEE5D2]/70">{caption}</span> : <span />}
        </div>
      </div>
    </div>
  );
}
