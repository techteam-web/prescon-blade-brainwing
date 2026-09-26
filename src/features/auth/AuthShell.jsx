import { PresconLogo, Wordmark } from '../../components/Wordmark';
import { Hairline } from '../../components/Primitives';

// Shared frame for both auth screens: the mark up top, a copper hairline, the
// step's content below. Kept static (no GSAP) — this sits in front of the whole
// app before anything else has mounted, so it has to render correctly on its very
// first frame with no entrance choreography to hide behind.
export function AuthShell({ children }) {
  return (
    <div className="flex w-full max-w-[26rem] flex-col items-center gap-[2.2em] px-[var(--screen-margin)]">
      <div className="flex flex-col items-center gap-[1.1em]">
        <PresconLogo className="w-[clamp(3.2rem,7vw,4.2rem)]" />
        <Wordmark className="w-[clamp(11rem,26vw,14rem)]" />
      </div>
      <Hairline className="max-w-[8rem]" />
      <div className="flex w-full flex-col items-stretch gap-[1.6em]">{children}</div>
    </div>
  );
}
