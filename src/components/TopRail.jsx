import { useCallback } from 'react';
import { useApp } from '../app/appContext';
import { BrandLockup } from './Wordmark';
import { EnterPortal } from './Primitives';

import { MenuIcon, HomeIcon } from './Icons';

// Present on every screen except the gate and the landing.
//
// Navigation lives TOP-LEFT, where the eye goes to get back. The Prescon lockup stays
// top-right as the fixed anchor: constant size and position, never animated on a page
// change.
//
// MENU and HOME are the same framed control as the landing's own call to action —
// EnterPortal's `size="sm"` variant exists for exactly this, so the rail's one
// interactive gesture (a bordered box with a travelling light and a fill-on-hover) is
// the same one a visitor already learned on the way in, not a second vocabulary.
function NavButton({ label, onClick, disabled, icon }) {
  return (
    <EnterPortal
      size="sm"
      onClick={onClick}
      disabled={disabled}
      icon={icon}
      className="pointer-events-auto"
    >
      {label}
    </EnterPortal>
  );
}

export function TopRail() {
  const {
    stage,
    current,
    registerChrome,
    goToMenu,
    goToLanding,
    isTransitioning,
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
        <div className="flex min-w-0 items-start gap-[1.4em] max-sm:gap-[0.9em]">
          {stage === 'section' ? (
            <NavButton
              label="Menu"
              onClick={goToMenu}
              disabled={isTransitioning}
              icon={<MenuIcon size="1em" />}
            />
          ) : null}

          <NavButton
            label="Home"
            onClick={goToLanding}
            disabled={isTransitioning}
            icon={<HomeIcon size="1em" />}
          />
        </div>

        <BrandLockup />
      </div>

      <div className="flex items-end justify-end gap-[2em]">
        {caption ? (
          <span className="text-caption text-[#EEE5D2]/70">
            {caption}
          </span>
        ) : (
          <span />
        )}
      </div>
    </div>
  </div>
);
};