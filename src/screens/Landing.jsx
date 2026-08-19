import { Screen } from '../layout/Screen';
import { Eyebrow, EnterPortal, RenderImage } from '../components/Primitives';
import { MapPinIcon } from '../components/Icons';
import { Wordmark } from '../components/Wordmark';
import { LANDING } from '../data/content';
import { renderIdFor } from '../data/renderMap';
import { useApp } from '../app/appContext';

// Page 1 of the vision document, rebuilt. The intro sequence (T6) animates this screen's
// own elements rather than a separate intro screen — the data-* markers below are its
// targets, and they are the contract between this file and TransitionDirector.js.
//
// No top rail here: the rail appears on every screen except the gate and the landing.

export function Landing() {
  const { goToMenu, isTransitioning } = useApp();

  return (
    <Screen id="landing" padded={false}>
      <div className="absolute inset-0">
        <RenderImage id={renderIdFor('landing')} priority sizes="100vw" />
      </div>

      <div
        data-scrim
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'var(--scrim-left)' }}
      />

      <div
        className="screen-inset-bare relative grid h-full min-h-0 grid-rows-[1fr_auto] gap-[3%]"
      >
        <div className="flex min-h-0 max-w-[56%] flex-col justify-center gap-[4%] max-lg:max-w-[72%] max-md:max-w-none">
          <Eyebrow landing data-landing-eyebrow>
            {LANDING.eyebrow}
          </Eyebrow>

          {/* Futura Light. The one place in the app that uses weight 300. */}
          <h1
            data-headline
            className="text-hero font-light uppercase text-blade-cream"
            style={{ lineHeight: 1.16 }}
          >
            {LANDING.headline.map((line) => (
              <span key={line} data-landing-line className="block">
                {line}
              </span>
            ))}
          </h1>

          <div className="flex min-w-0 flex-wrap items-center gap-x-[1.4em] gap-y-[0.8em]">
            <Wordmark className="w-[clamp(7rem,10.5vw,14rem)] shrink-0" />
            <span aria-hidden="true" className="h-[3.2em] w-px bg-blade-ink" />
            <span className="flex min-w-0 items-center gap-[0.5em] text-subhead text-blade-cream">
              <MapPinIcon className="text-blade-copper" size="1.1em" />
              <span className="font-serif italic">{LANDING.place}</span>
            </span>
          </div>

          <EnterPortal onClick={goToMenu} disabled={isTransitioning} data-enter className="mt-[1%] self-start">
            {LANDING.enter}
          </EnterPortal>
        </div>

      
      </div>
    </Screen>
  );
}
