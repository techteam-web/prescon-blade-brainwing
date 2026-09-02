import { memo, useCallback, useEffect, useRef, useState } from 'react';

// The raster plan image carries the real architectural drawing; this overlay lays the
// matching vector plate on top of it, one shape per office, as the clickable surface —
// invisible at rest, a copper wash on hover, ready to open that unit's views once they
// exist (see onSelectUnit in Plans.jsx). Both SVGs are drawn from the same source
// blueprint at the same aspect ratio, so tracing the overlay's own viewBox over the
// image keeps every shape pinned to its unit regardless of viewport size.
//
// The SVG file arrives with its own inline <style>{'.cls-1{fill:...;opacity:.5}'}</style>
// baked in — dropped here in favour of `.plan-overlay-shape` (styles/plans.css) so the
// idle/hover states match the rest of the UI instead of the brochure export's own look.
const cache = new Map();

// A wedge pointing `bearingDeg` from the pin, in this drawing's own compass frame —
// 0°/N is straight down the plate (not up the screen), clockwise, same convention as
// every yawDeg in floorPlanRadar.js. Built directly in that frame rather than drawn
// pointing "up" and rotated with a transform, so there is no separate transform-origin
// to keep in sync with the pin's own (dynamic, per-unit) centre.
function conePath(cx, cy, bearingDeg, radius, halfAngleDeg) {
  const toXY = (deg) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + radius * Math.sin(rad), y: cy + radius * Math.cos(rad) };
  };
  const left = toXY(bearingDeg - halfAngleDeg);
  const right = toXY(bearingDeg + halfAngleDeg);
  return `M ${cx} ${cy} L ${left.x} ${left.y} A ${radius} ${radius} 0 0 1 ${right.x} ${right.y} Z`;
}

function useOverlayMarkup(src) {
  // Reset synchronously during render (not in the effect body below) whenever `src`
  // changes — swapping straight to the cached entry, or to null while an uncached one
  // is still in flight. Only the actual fetch is left for the effect to own.
  const [state, setState] = useState(() => ({
    src,
    markup: src ? (cache.get(src) ?? null) : null,
  }));
  if (state.src !== src) {
    setState({ src, markup: src ? (cache.get(src) ?? null) : null });
  }

  useEffect(() => {
    if (!src || cache.has(src)) return;
    let cancelled = false;
    fetch(src)
      .then((res) => res.text())
      .then((text) => {
        if (cancelled) return;
        const viewBox = text.match(/viewBox="([^"]+)"/)?.[1] ?? null;
        const shapes = text
          .replace(/<\?xml[\s\S]*?\?>/, '')
          .replace(/<defs>[\s\S]*?<\/defs>/, '')
          .replace(/<svg[^>]*>/, '')
          .replace(/<\/svg>\s*$/, '')
          .replace(/class="cls-1"/g, 'class="plan-overlay-shape"');
        if (!viewBox) return;
        const parsed = { viewBox, shapes };
        cache.set(src, parsed);
        setState({ src, markup: parsed });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [src]);

  return state.src === src ? state.markup : null;
}

// Split out and memoized on purpose: the radar's `viewBearingDeg` (PanoramaFloorRadar.jsx)
// changes up to once a frame while the panorama is moving, and every one of those
// re-renders was re-committing this same dangerouslySetInnerHTML markup — which resets
// the shapes' live DOM and silently wiped the imperative `--active`/pin classList
// mutations below moments after they were applied. None of this layer's own props ever
// change on their own, so memo keeps it fully inert while the cone spins.
const ShapesLayer = memo(function ShapesLayer({ rootRef, viewBox, html, onClick, readOnly, className }) {
  return (
    <svg
      ref={rootRef}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      onClick={onClick}
      className={`plan-overlay pointer-events-none absolute inset-0 h-full w-full ${
        readOnly ? 'plan-overlay--readonly' : ''
      } ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

export function FloorPlanOverlay({
  src,
  onSelectUnit,
  className = '',
  // The panorama radar (PanoramaFloorRadar.jsx) reuses this same traced overlay as a
  // read-only "you are here" thumbnail rather than a second, hand-drawn copy of every
  // plate: `highlightId` drops a pin at that unit's centre, `readOnly` drops the
  // hover/click affordance the picker's own use of this component still needs.
  highlightId = null,
  readOnly = false,
  // The live look-direction cone drawn off the pin — this drawing's own compass
  // bearing (see conePath above), or null to draw the pin with no cone at all (the
  // floor picker's plain-thumbnail use, and the radar before the panorama itself has
  // reported an opening bearing).
  viewBearingDeg = null,
}) {
  const markup = useOverlayMarkup(src);
  const rootRef = useRef(null);
  const [pin, setPin] = useState(null);

  // Imperative on purpose — the shapes themselves are foreign DOM from
  // dangerouslySetInnerHTML above, not React elements, so there is no prop to read a
  // centre point off directly. Just locates the matching shape for its bounding box —
  // the pin's position — same escape hatch the click handler below already relies on
  // (event.target.closest('[id]')).
  useEffect(() => {
    const svg = rootRef.current;
    if (!svg || !highlightId) {
      setPin(null);
      return;
    }
    const shape = svg.querySelector(`[id="${CSS.escape(highlightId)}"]`);
    if (!shape) {
      setPin(null);
      return;
    }
    const box = shape.getBBox();
    setPin({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
  }, [markup, highlightId]);

  // Shapes are plain <path>/<polygon> elements injected via dangerouslySetInnerHTML —
  // React never attaches handlers to them directly, so the click is caught once on the
  // <svg> root and resolved back to whichever shape was actually hit.
  //
  // Alongside the shape id, this reports a compass bearing for where on the plate the
  // click landed — the click point relative to the plate's own centre, translated with
  // this drawing's compass (bottom edge = North/0°, right = East/90°, top = South/180°,
  // left = West/270°, so bearing = atan2(dx, dy)). It's used as the panorama's starting
  // look direction for that unit — see initialYaw on Panorama.jsx.
  const handleClick = useCallback(
    (event) => {
      const shape = event.target.closest('[id]');
      if (!shape?.id || shape.id === 'Layer_2') return;
      const rect = event.currentTarget.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const bearing = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
      onSelectUnit?.(shape.id, bearing);
    },
    [onSelectUnit],
  );

  if (!markup) return null;

  return (
    <>
      <ShapesLayer
        rootRef={rootRef}
        viewBox={markup.viewBox}
        html={markup.shapes}
        onClick={readOnly ? undefined : handleClick}
        readOnly={readOnly}
        className={className}
      />
      {/* A second SVG sharing the same viewBox/alignment, rather than an appendChild
          into the one above — that one's whole subtree is foreign dangerouslySetInnerHTML
          content, and React refuses to also own children on the same node. */}
      {pin ? (
        <svg
          viewBox={markup.viewBox}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          className="plan-overlay-pin-layer pointer-events-none absolute inset-0 h-full w-full"
        >
          {viewBearingDeg != null ? (
            <path d={conePath(pin.x, pin.y, viewBearingDeg, 260, 32)} className="plan-overlay-pin-cone" />
          ) : null}
          <circle cx={pin.x} cy={pin.y} r="45" className="plan-overlay-pin" />
        </svg>
      ) : null}
    </>
  );
}
