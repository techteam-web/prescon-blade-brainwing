import { useCallback, useRef } from 'react';
import { useApp } from '../app/appContext';
import { PresconLogo } from './Wordmark';
import { BackIcon, CompareIcon } from './Icons';
import { EnterPortal } from './Primitives';
import { gsap, useGSAP, D, E } from '../gsap/Gsapconfig';

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

export function TopRail() {
  const {
    stage,
    section,
    current,
    registerChrome,
    goToMenu,
    goToLanding,
    isTransitioning,
    compare,
    setCompare,
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
