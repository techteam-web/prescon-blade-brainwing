import { useCallback, useEffect, useState } from 'react';

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

export function FloorPlanOverlay({ src, onSelectUnit, className = '' }) {
  const markup = useOverlayMarkup(src);

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
    <svg
      viewBox={markup.viewBox}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      onClick={handleClick}
      className={`plan-overlay pointer-events-none absolute inset-0 h-full w-full ${className}`}
      dangerouslySetInnerHTML={{ __html: markup.shapes }}
    />
  );
}
