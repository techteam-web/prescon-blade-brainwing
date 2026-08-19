import { useRef } from 'react';
import { TOWER_ELEVATION } from '../../data/planAssets';
import { TOWER_ZONES, TOWER_ZONES_H } from '../../data/towerZones';
import { TOWER_HIGHLIGHT_VIEWBOX, ZONE_HIGHLIGHT } from '../../data/towerHighlights';
import { gsap, useGSAP, E } from '../../gsap/Gsapconfig';

// The tower sits in a box whose aspect-ratio is locked to the image's own, and the
// image fills that box exactly. No object-fit at all:
//
//   `cover`   would crop differently at each viewport, drifting every percentage zone
//             off its floor band — the failure the plan called out.
//   `contain` would letterbox inside the box whenever the box ratio differs by even a
//             rounding hair, which also drifts the zones (the zones are percentages of
//             the BOX, not of the drawn image). It also triggered a compositing bug here
//             where the bitmap simply did not paint at some box sizes.
//
// With the ratio locked and no fitting, the image and the zone overlay are the same
// rectangle by construction, which is the property the calibration depends on.
//
// The source is a raster composited on black, not vector. It used to be screen-blended
// over a matched backplate to hide that, which worked only for as long as the page ground
// was also near-black — the moment the ground warmed, the backplate read as a hard black
// rectangle. It now carries a real alpha channel instead, derived from the source's own
// luminance and unpremultiplied (scripts/extract-plans.mjs), so it composites correctly on
// any ground and needs no blend mode at all.
//
// Load any screen using this with ?zones to outline every zone in copper for calibration.
const SHOW_ZONES =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('zones');

// The traced highlight (src/data/towerHighlights.js) covers every zone from the crown
// down through the basement's services & parking wedge — each is either a straight-edged
// floor polygon or (basement) a hand-traced curved path, both rendered as <path>.
//
// The fill polygons are also the hit target for pointer input, not just decoration:
// the rectangular band below is a linear approximation of the floor lines and drifts
// from them near the extremes (see towerZones.js), so hovering near a boundary could
// light up the wrong, adjacent floor. Hit-testing the traced shape itself is exact by
// construction — the cursor is always over the floor it highlights.
function ZoneHighlight({ zoneId, state, onHover, onSelect, horizontal }) {
  const ref = useRef(null);
  const { contextSafe } = useGSAP({ scope: ref });
  const shapes = ZONE_HIGHLIGHT[zoneId];

  const paint = contextSafe((next) => {
    const active = next !== 'idle';
    gsap.to('[data-highlight-fill]', {
      opacity: next === 'locked' ? 0.55 : active ? 0.38 : 0,
      duration: 0.3,
      ease: E.soft,
    });
    gsap.to('[data-highlight-edge]', {
      opacity: next === 'locked' ? 1 : active ? 0.85 : 0,
      duration: 0.35,
      ease: E.soft,
    });
  });

  useGSAP(
    () => {
      if (!ref.current) return;
      paint(state);
    },
    { dependencies: [state], scope: ref },
  );

  if (!shapes?.length) return null;

  return (
    <svg
      aria-hidden="true"
      viewBox={TOWER_HIGHLIGHT_VIEWBOX}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ transform: horizontal ? 'rotate(-90deg)' : undefined }}
    >
      <g ref={ref}>
        {shapes.map((d, i) => (
          <path
            key={i}
            data-highlight-fill
            d={d}
            className="fill-blade-copper"
            opacity="0"
            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
            onPointerEnter={() => onHover(zoneId)}
            onPointerLeave={() => onHover(null)}
            onClick={() => onSelect(zoneId)}
          />
        ))}
        {shapes.map((d, i) => (
          <path
            key={i}
            data-highlight-edge
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth="18"
            className="text-blade-cream"
            opacity="0"
          />
        ))}
      </g>
    </svg>
  );
}

function Zone({ zone, state, onHover, onSelect, tabIndex, badge = null, horizontal }) {
  const ref = useRef(null);
  const { contextSafe } = useGSAP({ scope: ref });
  const { shape } = zone;
  // The traced SVG highlight takes over both the visual fill/edge and pointer hit-testing
  // for every zone now; the plain rectangle underneath stays mounted only as the
  // keyboard-focus target.
  const hasTracedHighlight = Boolean(ZONE_HIGHLIGHT[zone.id]?.length);

  // Hairlines draw outward from centre, 0.35s, bladeSoft.
  const paint = contextSafe((next) => {
    const active = next !== 'idle';
    gsap.to('[data-zone-fill]', {
      opacity: hasTracedHighlight ? 0 : next === 'locked' ? 0.22 : active ? 0.14 : 0,
      duration: 0.3,
      ease: E.soft,
    });
    gsap.to('[data-zone-edge]', {
      scaleX: hasTracedHighlight ? 0 : active ? 1 : 0,
      opacity: next === 'locked' ? 1 : 0.7,
      duration: 0.35,
      ease: E.soft,
    });
  });

  useGSAP(() => paint(state), { dependencies: [state], scope: ref });

  return (
    <>
      <ZoneHighlight
        zoneId={zone.id}
        state={state}
        onHover={onHover}
        onSelect={onSelect}
        horizontal={horizontal}
      />
      <button
        ref={ref}
        type="button"
        data-zone={zone.id}
        aria-label={`${zone.label}${zone.plan ? '' : ' — no floor plate'}`}
        aria-pressed={state === 'locked'}
        tabIndex={tabIndex}
        onPointerEnter={hasTracedHighlight ? undefined : () => onHover(zone.id)}
        onPointerLeave={hasTracedHighlight ? undefined : () => onHover(null)}
        onFocus={() => onHover(zone.id)}
        onClick={() => onSelect(zone.id)}
        className="absolute"
        style={{
          left: `${shape.x}%`,
          top: `${shape.y}%`,
          width: `${shape.w}%`,
          height: `${shape.h}%`,
          // Touch targets stay reachable even where a single floor band is only a few px.
          minHeight: '2px',
          outline: SHOW_ZONES ? '1px solid #CA8E5B' : undefined,
          // The traced polygon is the real pointer target once it exists — this rect
          // would otherwise sit on top of it and re-introduce the mismatch. It remains
          // reachable by keyboard (Tab + Enter/Space still fire its onClick/onFocus).
          pointerEvents: hasTracedHighlight ? 'none' : 'auto',
        }}
      >
        <span
          data-zone-fill
          aria-hidden="true"
          className="absolute inset-0 bg-blade-copper opacity-0"
        />
        <span
          data-zone-edge
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px origin-center scale-x-0 bg-blade-copper"
        />
        <span
          data-zone-edge
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px origin-center scale-x-0 bg-blade-copper"
        />

        {/* Compare mode only: the order this floor was picked in. Sits outside the band on
            the left so it never covers the elevation, and counter-scales against
            --tower-scale — it is inside the transformed tower, which grows to nearly 4x on
            a phone, and a badge that grew with it would swallow the building. */}
        {badge ? (
          <span
            data-zone-badge
            aria-hidden="true"
            className="zone-badge absolute right-[calc(100%+0.5em)] top-1/2 flex size-[1.55em] items-center justify-center bg-blade-copper text-[0.62em] font-bold tabular-nums text-blade-black"
          >
            {badge}
          </span>
        ) : null}
      </button>
    </>
  );
}

export function TowerElevation({
  hoveredId = null,
  lockedId = null,
  onHover = () => {},
  onSelect = () => {},
  zones,
  horizontal = false,
  interactive = true,
  selectedIds = [],
  className = '',
  overlay = null,
}) {
  const list = zones ?? (horizontal ? TOWER_ZONES_H : TOWER_ZONES);
  const ratio = horizontal
    ? TOWER_ELEVATION.height / TOWER_ELEVATION.width
    : TOWER_ELEVATION.width / TOWER_ELEVATION.height;

  // A picked floor reads as locked. Compare mode can hold three at once, which is the
  // only reason this is a list and not the single `lockedId` the screen normally uses.
  const stateOf = (id) =>
    lockedId === id || selectedIds.includes(id)
      ? 'locked'
      : hoveredId === id
        ? 'hover'
        : 'idle';

  return (
    <div className={`relative flex h-full w-full items-center justify-center ${className}`}>
      <div
        className="relative h-full"
        style={{ aspectRatio: String(ratio), maxWidth: '100%' }}
      >
        <img
          src={TOWER_ELEVATION.src}
          width={TOWER_ELEVATION.width}
          height={TOWER_ELEVATION.height}
          alt="The Blade by Prescon — tower elevation"
          decoding="async"
          className="absolute inset-0 h-full w-full"
          style={{ transform: horizontal ? 'rotate(-90deg)' : undefined }}
        />

        {interactive
          ? list.map((zone, i) => (
              <Zone
                key={zone.id}
                zone={zone}
                state={stateOf(zone.id)}
                onHover={onHover}
                onSelect={onSelect}
                horizontal={horizontal}
                tabIndex={i === 0 ? 0 : -1}
                badge={
                  selectedIds.indexOf(zone.id) >= 0 ? selectedIds.indexOf(zone.id) + 1 : null
                }
              />
            ))
          : null}

        {/* Anchored to THIS box, not the outer column: the column is wider than the
            drawn image whenever height is the constraining dimension, and that gap's
            size drifts with viewport aspect (it isn't a fixed fraction), so a caller
            positioning against the column's own edge sits at a different distance from
            the tower at every breakpoint — flush against it at some, far from it at
            others. This box is the image's own rectangle by construction (see above),
            so anchoring here keeps the offset identical everywhere. */}
        {overlay}
      </div>
    </div>
  );
}
