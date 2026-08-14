import wordmarkSrc from '../assets/brand/wordmark.svg?raw';
import presconSrc from '../assets/brand/prescon-logo.png';

// The wordmark is real vector, extracted from the source PDF by scripts/extract-brand.mjs
// rather than traced. It is inlined (not an <img>) because the intro sequence animates
// its individual paths.

// MuPDF converts glyphs to filled outlines, so there are no strokes to draw. Adding a
// stroke to each contour gives the intro its "the mark draws itself in the wake of the
// strike" effect: stroke-dashoffset runs the outline, then it crossfades to fill.
const wordmarkMarkup = wordmarkSrc
  .replace(/<svg /, '<svg data-wordmark-svg ')
  .replace(
    /<path /g,
    '<path data-wordmark-path stroke="currentColor" stroke-width="0.75" ' +
      'vector-effect="non-scaling-stroke" fill-opacity="1" stroke-opacity="0" ',
  );

export function Wordmark({ className = '', title = 'The Blade by Prescon', ...rest }) {
  return (
    <span
      data-wordmark
      role="img"
      aria-label={title}
      className={`block text-blade-cream ${className}`}
      {...rest}
      dangerouslySetInnerHTML={{ __html: wordmarkMarkup }}
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
