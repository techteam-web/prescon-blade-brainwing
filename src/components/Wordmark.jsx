import { useId, useMemo } from 'react';
import wordmarkSrc from '../assets/brand/wordmark.svg?raw';
import presconSrc from '../assets/brand/prescon-logo.png';

// The wordmark is real vector, extracted from the source PDF by scripts/extract-brand.mjs
// rather than traced. It is inlined (not an <img>) because the intro sequence animates
// its individual paths.

// MuPDF converts glyphs to filled outlines, so there are no strokes to draw. Adding a
// stroke to each contour gives the intro its "the mark draws itself in the wake of the
// strike" effect: stroke-dashoffset runs the outline, then it crossfades to fill.
//
// Every glyph shares the same fill so the mark reads as one piece rather than a random
// per-letter patchwork. Normally that fill is flat currentColor; the `gradient` prop (used
// by the fullscreen gate's centre mark) swaps it for a shared linearGradient instead —
// still one fill across every glyph, just not flat. Either way, the stroke used for the
// draw-in stays currentColor, so the crossfade animation below is untouched.

function buildWordmarkMarkup(gradientId) {
  let markup = wordmarkSrc
    .replace(/<svg /, '<svg data-wordmark-svg ')
    .replace(
      /<path /g,
      '<path data-wordmark-path stroke="currentColor" stroke-width="0.75" ' +
        'vector-effect="non-scaling-stroke" fill-opacity="1" stroke-opacity="0" ',
    );

  if (gradientId) {
    markup = markup
      .replace(/fill="currentColor"/g, `fill="url(#${gradientId})"`)
      .replace(
        /(<svg[^>]*>)/,
        `$1<defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">` +
          '<stop offset="0%" stop-color="#f7efdd" />' +
          '<stop offset="55%" stop-color="#ca8e5b" />' +
          '<stop offset="100%" stop-color="#8f5c34" />' +
          '</linearGradient></defs>',
      );
  }

  return markup;
}

export function Wordmark({
  className = '',
  title = 'The Blade by Prescon',
  corner = false,
  gradient = false,
  ...rest
}) {
  const reactId = useId();
  const gradientId = gradient ? `wordmark-gradient-${reactId.replace(/[^a-zA-Z0-9]/g, '')}` : null;
  const markup = useMemo(() => buildWordmarkMarkup(gradientId), [gradientId]);

  return (
    <span
      data-wordmark
      // Set by BrandLockup only. The fixed corner mark never animates — see the
      // comment on it in Landing.jsx — so introSequence (TransitionDirector.js)
      // excludes anything carrying this flag when it picks which [data-wordmark]
      // is "the" lockup to travel from centre stage to its resting position, and
      // which [data-wordmark-path] elements are the ones being drawn.
      {...(corner ? { 'data-corner-mark': true } : null)}
      role="img"
      aria-label={title}
      className={`block text-blade-cream ${className}`}
      {...rest}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

// The Prescon lockup is a raster, deliberately — see scripts/extract-brand.mjs. Its two
// larger peaks are gradient-filled, and a path-only vector extraction drops them and
// leaves the mark as one peak plus two slivers. This is the client's registered corporate
// mark; it has to be exact. It never animates and never recolours, so a transparent PNG
// costs nothing and guarantees fidelity.
export function PresconLogo({ className = '', title = 'Prescon' }) {
  return (
    <img
      data-prescon-logo
      src={presconSrc}
      alt={title}
      decoding="async"
      className={`block h-auto ${className}`}
    />
  );
}

// The fixed top-right anchor: Prescon lockup, the blade slash, the Blade wordmark.
// Same three elements, same order, everywhere it appears — TopRail (menu/section) and
// any other screen that wants the permanent corner mark rather than a hero placement.
export function BrandLockup({ className = '' }) {
  return (
    <div className={`flex shrink-0 items-center gap-[0.4em] max-sm:gap-[0.16em] ${className}`}>
      {/* clamp()'s own floor (2.1rem) was still too wide once TopRail's nav cluster
          stopped shrinking to make room for it — on a narrow phone the two together
          no longer fit and this mark ran off the right edge instead of MENU/HOME
          clipping. max-sm drops the floor further, since this mark is decorative and
          the nav buttons are the ones that have to stay full size. */}
      <PresconLogo className="w-[clamp(2.6rem,3.5vw,4.5rem)] max-sm:w-[1.6rem]" />
      {/* A single straight copper stroke, standing in for a "/" the way a plain divider
          would, rather than italicised at the blade angle.

          The bar is sized to sit fully inside this span's own height rather than
          overflowing it — a bar that paints outside its box doesn't inflate the box,
          so TopRail's chrome measurement (which sizes --chrome-top off the rail's real
          layout box) never sees the overflow, and every screen below it — Plans' floor
          panel among them — pads for a shorter mark than what actually got painted, so
          it would land right underneath the tail of the bar. --chrome-top is also a
          fixed clamp(), not remeasured off the rail at all, so the mark has to stay
          inside that fixed budget on its own — kept short on purpose, not just
          contained. */}
      <span aria-hidden="true" className="mx-[0.3em] flex h-[4.4em] items-center max-sm:mx-[0.08em] max-[360px]:hidden">
        <span className="h-[4.1em] w-[3px] [background:var(--copper-gradient)]" />
      </span>
      {/* Below 360px (the oldest iPhone SE's 320px included) even a legible-sized
          wordmark plus the logo and MENU/HOME no longer all fit — shrinking the
          wordmark further than 3.8rem started running into its own letterforms, three
          lines of real type, not a mark that reads fine tiny. Dropped instead: the
          logo + slash alone still say "Prescon" and fit comfortably, and the full
          lockup is one tap away on every other screen in the app. */}
      <Wordmark corner className="w-[clamp(6.4rem,8.8vw,11rem)] max-sm:w-[3.8rem] max-[360px]:hidden" />
    </div>
  );
}
