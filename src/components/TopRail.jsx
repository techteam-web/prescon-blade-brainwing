import { useCallback, useRef } from 'react';
import { useApp } from '../app/appContext';
import { PresconLogo } from './Wordmark';
import { BackIcon } from './Icons';
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
  const { stage, current, registerChrome, goToMenu, goToLanding, isTransitioning } = useApp();
  const swapRef = useCallback((el) => registerChrome('railSwap', el), [registerChrome]);

  const visible = stage === 'menu' || stage === 'section';
  const caption = current?.caption ?? null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100]"
      style={{ padding: 'var(--screen-margin)' }}
      aria-hidden={!visible}
    >
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-[2em]">
          <div className="flex items-start gap-[2.2em]">
            {/* The two places anyone ever wants to get back to. */}
            {stage === 'section' ? (
              <NavButton label="Menu" onClick={goToMenu} disabled={isTransitioning} icon />
            ) : null}
            <NavButton label="Home" onClick={goToLanding} disabled={isTransitioning} />

            <div ref={swapRef} className="flex flex-col gap-[0.35em] pl-[0.4em]">
              {visible && current ? (
                <span
                  data-flip-id={`idx:${current.id}`}
                  className="text-caption tabular-nums tracking-[0.28em] text-blade-copper"
                >
                  {current.no}
                </span>
              ) : null}
            </div>
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
