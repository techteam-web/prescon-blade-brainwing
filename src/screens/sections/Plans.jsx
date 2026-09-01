import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Screen } from '../../layout/Screen';
import { SectionTitle } from './SectionShell';
import { TowerElevation } from '../../features/plans/TowerElevation';
import { TowerIcon, FullscreenIcon, CloseIcon } from '../../components/Icons';
import { ReraTable } from '../../features/plans/ReraTable';

import { TOWER_ZONES, ZONE_BY_ID } from '../../data/towerZones';

import { CompareDeck } from '../../features/plans/CompareDeck';
import { PlateWipeCanvas } from '../../features/plans/PlateWipeCanvas';
import { FloorPlanOverlay } from '../../features/plans/FloorPlanOverlay';
import { UnitPanoramaViewer } from '../../features/plans/UnitPanoramaViewer';


import { getPlate } from '../../data/floorPlates';
import { getPlan, getPlanSvg, PLAN_ASSETS, TOWER_ELEVATION } from '../../data/planAssets';
import { getFloorPanorama } from '../../data/floorPanoramas';
import { CONTENT } from '../../data/content';
import { gsap, useGSAP, E, D, durationScale, prefersReducedMotion } from '../../gsap/Gsapconfig';
import { useIdleTask } from '../../hooks/useEventListener';

import { useApp } from '../../app/appContext';

// Tower left ~34%, plan panel right ~66%.
//
// Hover only highlights the band and the label chip; the right panel swaps solely on
// click, which locks the selection. Service and amenity floors have no plate and swap
// to an amenity card instead — the panel is never empty.
//
// COMPARE MODE is the screen's second state, opened from the rail. The tower leaves its
// column, centres on the page and grows; up to three floors are picked off it; the tower
// then dissolves and the picked plates rise in side by side. Closing reverses the whole
// thing. The state machine lives in AppState (the control is in the rail, which knows
// nothing about screens); everything else — the picks and all of the motion — is here.

const MAX_PICKS = 3;

// Only floors with a published plate can be compared, so compare mode narrows the tower
// to exactly those bands. A service level is not a choice you should be able to make.
const COMPARABLE = TOWER_ZONES.filter((z) => z.plan);

const TOWER_RATIO = TOWER_ELEVATION.width / TOWER_ELEVATION.height;

// Every plan image is decoded up front, so a plate swap never waits on the network.
function usePreloadPlans() {
  useIdleTask(() => {
    for (const asset of Object.values(PLAN_ASSETS)) {
      const img = new Image();
      img.src = asset.src;
      img.decode?.().catch(() => {});
    }
  });
}

function AmenityCard({ zone }) {
  const panel = CONTENT.gallery.find((a) => a.id === zone.amenity);
  return (
    <div className="flex h-full min-h-0 flex-col justify-center gap-[1em] p-[6%] text-blade-cream">
      <span className="text-caption uppercase tracking-[0.24em] text-blade-copper">
        {zone.floors}
      </span>
      <h2 className="text-headline uppercase">{zone.label}</h2>
      <span aria-hidden="true" className="h-px w-[34%] bg-blade-copper" />
      {panel ? (
        <>
          <p className="max-w-[54ch] text-caption text-blade-cream/80">{panel.body}</p>
          {panel.list ? (
            <ul className="flex flex-wrap gap-x-[1.2em] gap-y-[0.3em]">
              {panel.list.map((item) => (
                <li key={item} className="text-caption text-blade-cream/60">
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <p className="text-caption text-blade-cream/60">
          {zone.service
            ? 'A service level. No leasable floor plate.'
            : 'No floor plate is published for this level.'}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- compare prompt */

// Always mounted, hidden by default, shown only by GSAP — same reason as the deck.
function ComparePrompt({ innerRef, picks, onRemove, onCompare, onCancel }) {
  const ready = picks.length >= 2;

  return (
    // The safe area is a PADDED flex parent, not an offset on the panel itself. An
    // absolutely positioned child resolves against its container's padding box — it
    // ignores the padding — and `--screen-margin` is a percentage, which resolves
    // against WIDTH even when it is used as a `top`. Between them the panel landed
    // under the Prescon lockup. As a flex child inside `.screen-inset` it cannot.
    <div className="screen-inset pointer-events-none absolute inset-0 z-30 flex items-start justify-end max-md:items-end">
      <div
        ref={innerRef}
        className="glass invisible pointer-events-auto flex w-[clamp(14rem,20vw,19rem)] flex-col gap-[0.75em] p-[1.1em] opacity-0 max-md:w-full"
      >
        <div className="flex items-baseline justify-between gap-[1em]">
          <span className="eyebrow">Compare</span>
          <span className="text-caption tabular-nums text-blade-cream/60">
            {picks.length} / {MAX_PICKS}
          </span>
        </div>

      

        <ul className="flex min-h-[1.6em] flex-col gap-[0.3em]">
          {picks.map((id, i) => (
            <li
              key={id}
              className="flex items-baseline justify-between gap-[0.7em] border-t border-blade-ink/70 pt-[0.32em]"
            >
              <span className="flex min-w-0 items-baseline gap-[0.6em]">
                <span className="shrink-0 text-caption tabular-nums text-blade-copper">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 truncate text-caption text-blade-cream">
                  {getPlate(ZONE_BY_ID[id]?.plan)?.label ?? ZONE_BY_ID[id]?.label}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onRemove(id)}
                aria-label={`Remove ${ZONE_BY_ID[id]?.label}`}
                className="shrink-0 text-caption text-blade-cream/45 transition-colors duration-300 hover:text-blade-copper"
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between gap-[1em] pt-[0.2em]">
          <button
            type="button"
            onClick={onCancel}
            className="text-caption uppercase tracking-[0.2em] text-blade-cream/50 transition-colors duration-300 hover:text-blade-cream"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onCompare}
            disabled={!ready}
            className="group/x relative text-caption uppercase tracking-[0.2em] text-blade-copper disabled:text-blade-cream/25"
          >
            Compare
            <span
              aria-hidden="true"
              className={`absolute inset-x-0 -bottom-[0.3em] h-px origin-left bg-blade-copper transition-transform duration-300 ${
                ready ? 'scale-x-100' : 'scale-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- the screen */

export function Plans() {
  const [hovered, setHovered] = useState(null);
  const [locked, setLocked] = useState(null);
  const [shown, setShown] = useState(null);
  const [picks, setPicks] = useState([]);
  const [activeView, setActiveView] = useState(null);
  const frame = useRef(null);
  const tower = useRef(null);
  const title = useRef(null);
  const scrim = useRef(null);
  const prompt = useRef(null);
  const deck = useRef(null);
  const wipe = useRef(null);

  const firstPaint = useRef(true);
  const prevShown = useRef(null);
  const prevCompare = useRef('off');
  const fit = useRef({ x: 0, y: 0, scale: 1 });
  const wipeProgress = useRef({ value: 0 });
  const swapCall = useRef(null);

  const { compare, setCompare } = useApp();
  const comparing = compare !== 'off';

  usePreloadPlans();

  // The plan panel itself is the fullscreen target, same trick as Gallery's render
  // view — the browser's UA stylesheet stretches whatever element is fullscreened to
  // fill the viewport, so the currently shown plate just gets more room for free. The
  // RERA table is hidden while fullscreen (see the `fullscreen &&` below) since the
  // point is to see the plan itself, not the numbers next to it.
  const [planFullscreen, setPlanFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setPlanFullscreen(document.fullscreenElement === frame.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const togglePlanFullscreen = useCallback(() => {
    const el = frame.current;
    if (!el) return;
    if (document.fullscreenElement === el) document.exitFullscreen();
    else el.requestFullscreen?.().catch(() => {});
  }, []);

  // Hover only highlights the band and the label chip — the panel on the right is a
  // click-only choice, so sweeping the pointer up the tower never thrashes it.
  const onHover = useCallback((id) => {
    setHovered(id);
  }, []);


  // Only floors with a published plate can be locked in — hover still lights up every
  // band (crown, service floors, amenities), but clicking one of those is a no-op.
  const onSelect = useCallback((id) => {
    if (!ZONE_BY_ID[id]?.plan) return;
    setLocked(id);
    setShown(id);
  }, []);

  // In compare mode the same click toggles membership of the picked set instead.
  const onPick = useCallback((id) => {
    if (!ZONE_BY_ID[id]?.plan) return;
    setPicks((list) =>
      list.includes(id)
        ? list.filter((x) => x !== id)
        : list.length >= MAX_PICKS
          ? list
          : [...list, id],
    );
  }, []);

  const removePick = useCallback((id) => setPicks((l) => l.filter((x) => x !== id)), []);

  // Clicking a unit shape in the plan overlay opens that floor's 360° panorama — only
  // floors with an actual drone still (floorPanoramas.js) have one; anything else is a
  // no-op rather than opening an empty viewer.
  const onOpenView = useCallback((zoneId, unitId, bearingDeg) => {
    if (!getFloorPanorama(zoneId)) return;
    setActiveView({ zoneId, unitId, bearingDeg });
  }, []);

  const closeView = useCallback(() => setActiveView(null), []);

  // ↑/↓ move between zones, Enter locks (or picks, in compare mode).
  const onKeyDown = (event) => {
    const list = comparing ? COMPARABLE : TOWER_ZONES;
    const i = list.findIndex((z) => z.id === (hovered ?? locked));
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const next = list[Math.min(list.length - 1, Math.max(0, i + (event.key === 'ArrowUp' ? -1 : 1)))];
      if (next) onHover(next.id);
      event.preventDefault();
    } else if (event.key === 'Enter' || event.key === ' ') {
      if (hovered) (comparing ? onPick : onSelect)(hovered);
      event.preventDefault();
    }
  };

  /* ------------------------------------------------------------- plate swapping */

  // The bug this replaces: nothing established a resting state, so on mount every one of
  // the nine plates was visible and each was TWEENED to hidden over half a second — nine
  // full-size floor drawings stacked and sliding, underneath the entry transition's
  // full-screen blur. That is the "glitchy split" on the way into this screen.
  //
  // Now the first pass is a `set`, not a `to`, and it happens in the same frame the
  // screen mounts. Later swaps run a shader wipe (plateWipeGL.js) over the panel: a
  // noise-warped band sweeps down covering the outgoing plate, the actual DOM swap
  // happens underneath at the moment the band is most opaque (so it's never visible),
  // and the same band continues on to uncover the incoming plate. Reduced-motion and
  // WebGL-unavailable both fall back to an instant swap, no wipe.
  useGSAP(
    () => {
      const root = frame.current;
      if (!root) return;
      const layers = Array.from(root.querySelectorAll('[data-plate]'));
      const incoming = layers.find((l) => l.dataset.plate === shown);
      const leavingId = prevShown.current;
      prevShown.current = shown;

      if (firstPaint.current) {
        firstPaint.current = false;
        for (const layer of layers) {
          const on = layer === incoming;
          gsap.set(layer, {
            autoAlpha: on ? 1 : 0,
            zIndex: on ? 1 : 0,
            pointerEvents: on ? 'auto' : 'none',
          });
        }
        return;
      }
      if (shown === leavingId || !incoming) return;

      const swap = () => {
        for (const layer of layers) {
          const on = layer === incoming;
          gsap.set(layer, {
            autoAlpha: on ? 1 : 0,
            zIndex: on ? 1 : 0,
            pointerEvents: on ? 'auto' : 'none',
          });
        }
      };

      swapCall.current?.kill();
      gsap.killTweensOf(wipeProgress.current);

      if (prefersReducedMotion() || !wipe.current?.ready) {
        swap();
        return;
      }

      wipeProgress.current.value = 0;
      wipe.current.render(0);

      const duration = D.wipe * durationScale();

      // The band is at its most opaque a little past the midpoint (see coverP/clearP
      // in the shader) — that's the one moment the swap underneath is fully hidden.
      swapCall.current = gsap.delayedCall(duration * 0.48, swap);

      gsap.to(wipeProgress.current, {
        value: 1,
        duration,
        ease: 'none',
        onUpdate: () => wipe.current?.render(wipeProgress.current.value),
        onComplete: () => wipe.current?.render(0),
      });
    },
    { dependencies: [shown], scope: frame },
  );

  /* -------------------------------------------------------------- compare motion */

  // Measured, never authored: the tower's rest box depends on the breakpoint, the
  // chrome insets and the title's wrapped height. Taken while the tower is untransformed,
  // which is only true on the way in from 'off'.
  const measure = useCallback((el) => {
    const r = el.getBoundingClientRect();
    if (!r.height) return { x: 0, y: 0, scale: 1 };
    const drawnWidth = Math.max(r.height * TOWER_RATIO, 1);
    return {
      x: window.innerWidth / 2 - (r.left + r.width / 2),
      y: window.innerHeight / 2 - (r.top + r.height / 2),
      // Height governs on every desktop breakpoint; width only ever bites on a very
      // short landscape phone, where the tower would otherwise grow past the edges.
      scale: Math.min(
        (window.innerHeight * 0.92) / r.height,
        (window.innerWidth * 0.7) / drawnWidth,
      ),
    };
  }, []);

  useGSAP(
    () => {
      const from = prevCompare.current;
      prevCompare.current = compare;
      if (from === compare) return;

      const el = tower.current;
      const panel = frame.current;
      if (!el || !panel) return;

      const cols = deck.current
        ? Array.from(deck.current.querySelectorAll('[data-compare-inner]'))
        : [];
      const rules = deck.current
        ? Array.from(deck.current.querySelectorAll('[data-compare-rule]'))
        : [];
      const bar = deck.current?.querySelector('[data-compare-bar]') ?? null;
      const tl = gsap.timeline();

      /* off → picking: the tower leaves its column, centres, and grows. */
      if (compare === 'picking' && from === 'off') {
        gsap.set(el, { x: 0, y: 0, scale: 1, '--tower-scale': 1 });
        fit.current = measure(el);
        gsap.set(el, { zIndex: 20, transformOrigin: 'center center' });

        tl.to(panel, { xPercent: 6, autoAlpha: 0, duration: 0.5, ease: E.in }, 0)
          .to(title.current, { autoAlpha: 0, y: -14, duration: 0.42, ease: E.in }, 0)
          .to(scrim.current, { autoAlpha: 1, duration: 0.75 }, 0.05)
          // Centre first…
          .to(el, { x: fit.current.x, y: fit.current.y, duration: 0.9 }, 0.16)
          // …then grow, overlapping just enough that it reads as one move with two acts.
          .to(el, { scale: fit.current.scale, '--tower-scale': fit.current.scale, duration: 1.05 }, 0.44)
          .fromTo(
            prompt.current,
            { autoAlpha: 0, x: 34, y: -10 },
            { autoAlpha: 1, x: 0, y: 0, duration: 0.65 },
            0.78,
          );
        return;
      }

      /* picking → open: the tower dissolves, the plates rise. */
      if (compare === 'open') {
        tl.to(prompt.current, { autoAlpha: 0, x: 26, duration: 0.4, ease: E.in }, 0)
          .to(
            el,
            {
              scale: fit.current.scale * 1.22,
              '--tower-scale': fit.current.scale * 1.22,
              autoAlpha: 0,
              filter: 'blur(18px)',
              duration: 0.9,
              ease: E.in,
            },
            0.05,
          )
          .set(deck.current, { autoAlpha: 1 }, 0.52)
          .fromTo(bar ?? {}, { autoAlpha: 0, y: -18 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.58);
        if (cols.length) {
          // yPercent only. The outer column clips, so this is a true reveal that never
          // repaints the drawing inside it.
          tl.fromTo(cols, { yPercent: 100 }, { yPercent: 0, duration: 0.95, stagger: 0.1 }, 0.62);
        }
        if (rules.length) {
          tl.fromTo(
            rules,
            { scaleY: 0 },
            { scaleY: 1, duration: 0.85, stagger: 0.1, transformOrigin: 'top center' },
            0.78,
          );
        }
        return;
      }

      /* open → picking: back to the tower to change the selection. */
      if (compare === 'picking' && from === 'open') {
        if (cols.length) {
          tl.to(cols, { yPercent: 100, duration: 0.55, stagger: { each: 0.06, from: 'end' }, ease: E.in }, 0);
        }
        tl.to(bar ?? {}, { autoAlpha: 0, y: -16, duration: 0.4, ease: E.in }, 0.06)
          .set(deck.current, { autoAlpha: 0 }, 0.72)
          .to(
            el,
            {
              scale: fit.current.scale,
              '--tower-scale': fit.current.scale,
              autoAlpha: 1,
              filter: 'blur(0px)',
              duration: 0.85,
            },
            0.55,
          )
          .fromTo(
            prompt.current,
            { autoAlpha: 0, x: 26 },
            { autoAlpha: 1, x: 0, duration: 0.55 },
            0.95,
          );
        return;
      }

      /* anything → closing: the full reverse, then the state lands back on 'off'. */
      if (compare === 'closing') {
        const hadDeck = from === 'open';
        if (hadDeck && cols.length) {
          tl.to(cols, { yPercent: 100, duration: 0.6, stagger: { each: 0.07, from: 'end' }, ease: E.in }, 0);
        }
        if (hadDeck) {
          if (rules.length) tl.to(rules, { scaleY: 0, duration: 0.45, ease: E.in }, 0);
          tl.to(bar ?? {}, { autoAlpha: 0, y: -16, duration: 0.45, ease: E.in }, 0.08)
            .set(deck.current, { autoAlpha: 0 }, 0.78)
            .to(
              el,
              {
                scale: fit.current.scale,
                '--tower-scale': fit.current.scale,
                autoAlpha: 1,
                filter: 'blur(0px)',
                duration: 0.8,
              },
              0.6,
            );
        }
        const home = hadDeck ? 1.35 : 0;
        tl.to(prompt.current, { autoAlpha: 0, x: 26, duration: 0.35, ease: E.in }, hadDeck ? 0 : 0)
          .to(el, { x: 0, y: 0, scale: 1, '--tower-scale': 1, duration: 1.0 }, home)
          .to(scrim.current, { autoAlpha: 0, duration: 0.7 }, home + 0.15)
          .to(title.current, { autoAlpha: 1, y: 0, duration: 0.6 }, home + 0.3)
          .to(panel, { xPercent: 0, autoAlpha: 1, duration: 0.85 }, home + 0.22)
          .set(el, { zIndex: 'auto' })
          .call(() => setCompare('off'));
      }
    },
    { dependencies: [compare], scope: tower },
  );

  const openDeck = useCallback(() => {
    if (picks.length < 2) return;
    // The plate the screen returns to when the deck closes is the last one picked.
    const last = picks[picks.length - 1];
    setLocked(last);
    setShown(last);
    setCompare('open');
  }, [picks, setCompare]);

  const chip = ZONE_BY_ID[hovered ?? locked];
  const chipPlate = chip?.plan ? getPlate(chip.plan) : null;
  const shownHasPlan = Boolean(ZONE_BY_ID[shown]?.plan);

  const zoneList = useMemo(() => (comparing ? COMPARABLE : TOWER_ZONES), [comparing]);


  return (
    <Screen id="plans">
      {/* Compare mode's ground. Behind the tower, over everything else. */}
      <div
        ref={scrim}
        aria-hidden="true"
        className="invisible pointer-events-none absolute inset-0 z-10 bg-blade-black/78 opacity-0 backdrop-blur-[2px]"
      />

      {/* pt- on top of Screen's own screen-inset: --chrome-top is a fixed clamp(), not
          remeasured off the rail, so it doesn't grow with the brand mark in the corner —
          this extra clearance is what actually keeps the plan panel's top edge (and the
          tower/plate cards it sizes to h-full) out from under it. */}
      <div className="grid h-full min-h-0 grid-cols-[34fr_66fr] gap-[3%] pt-[1.8em] max-md:grid-cols-1 max-md:grid-rows-[44%_56%] max-md:gap-[2%]">
        <div className="flex min-h-0 flex-col gap-[1em]">
          <div ref={title}>
            <SectionTitle id="plans" />
          </div>
          <div
            ref={tower}
            data-stagger
            // RESPONSIVE FIX: z-10 added. GSAP puts `will-change: transform` on every
            // [data-stagger] element (this one and the plan panel's wrapper below), and
            // that alone promotes each to its own stacking context — so the z-30 on the
            // label chip inside this box (a few lines down) could only ever out-rank
            // other things in HERE, never the plan panel's column, which is a sibling
            // context that simply paints after this one in DOM order. Raising this
            // wrapper's own stacking position is what actually lets the chip that spills
            // out of its right edge sit above the plan panel next to it.
            className="relative z-10 min-h-0 flex-1"
            role="listbox"
            aria-label={comparing ? 'Floors to compare' : 'Floors'}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerLeave={() => setHovered(null)}
          >
            <TowerElevation
              hoveredId={hovered}
              lockedId={comparing ? null : locked}
              selectedIds={comparing ? picks : []}
              zones={zoneList}
              onHover={onHover}
              onSelect={comparing ? onPick : onSelect}
              overlay={
                // The label chip — one of the three permitted glass surfaces. Compare
                // mode hides it: the prompt is already naming every floor that matters.
                // Anchored just outside the drawn tower's own edge (not the wider
                // column around it) so the gap stays the same at every breakpoint —
                // see the comment in TowerElevation.
                chip && !comparing ? (
                  // RESPONSIVE FIX: z-30 added. The chip is anchored just past the
                  // tower's own edge, in the grid gap between the tower column and the
                  // plan panel (grid-cols-[34fr_66fr] a few lines up). At desktop widths
                  // that gap is wide enough that this never mattered, but the plan
                  // panel's column comes after this one in the DOM and both columns are
                  // `position: relative` with no z-index of their own — so on narrower
                  // layouts (iPad portrait and below, where the gap shrinks) the plan
                  // panel painted on top and hid all but a sliver of the chip's text.
                  <div
                    className="glass pointer-events-none absolute left-full z-30 flex flex-col gap-[0.2em] px-[0.9em] py-[0.5em]"
                    style={{
                      top: `${chip.shape.y + chip.shape.h / 2}%`,
                      transform: 'translateY(-50%)',
                      marginLeft: '0.6em',
                    }}
                  >
                    <span className="whitespace-nowrap text-caption font-medium text-blade-cream">
                      {chip.label}
                    </span>
                    {chipPlate ? (
                      <span className="whitespace-nowrap text-caption tabular-nums text-blade-copper">
                        {chipPlate.total.toLocaleString('en-IN')} sq.ft RERA carpet
                      </span>
                    ) : null}
                  </div>
                ) : null
              }
            />
          </div>
        </div>

        <div
          ref={frame}
          data-stagger
          className="relative min-h-0 min-w-0"
        >
          {TOWER_ZONES.map((zone) => {
            const plan = getPlan(zone.plan);
            const planSvg = getPlanSvg(zone.plan);
            const plate = getPlate(zone.plan);
            return (
              <div
                key={zone.id}
                data-plate={zone.id}
                aria-hidden={shown !== zone.id}
                // The resting state is declared here as well as set by GSAP: the class
                // wins on the very first paint, before any script has run.
                //
                // Square corners throughout — deliberately no `rounded-*` anywhere in
                // this card. The gold border is the one frame the brochure page uses.
                className={`absolute inset-0 grid min-h-0 grid-rows-[auto_1fr_auto_auto] gap-[0.9em] overflow-hidden border border-blade-copper/45 bg-blade-black-2 p-[1.1em] ${
                  zone.id === shown ? '' : 'invisible opacity-0'
                }`}
              >
                <div className="flex items-baseline gap-[1.4em] border-b border-blade-copper/30 pb-[0.7em]">
                  {/* zone.label, not plate.label — several zones (f19/f21-26, f20/f27)
                      share one printed plate/plan across a wider floor range than the
                      zone itself covers, so plate.label reads as "19th & 21st to 26th
                      Floor" even when this card is showing just the 19th on its own.
                      zone.label is always the specific floor(s) actually selected. */}
                  <h2 className="text-subhead font-medium uppercase tracking-[0.06em] text-blade-cream">
                    {zone.label}
                  </h2>
                </div>

                {plan ? (
                  <>
                    {/* No canvas fill behind the drawing — the plan's own alpha channel
                        is real (transparent outside the drawn plate, not painted
                        ivory), so it sits straight on the card's dark ground. */}
                    <div className="relative min-h-0 p-[2.5%]">
                      {/* The overlay below is `absolute inset-0`, which resolves
                          against this box's PADDING edge, not its content edge — the
                          same quirk noted on the compare prompt above. Without this
                          inner, padding-free wrapper the overlay would render larger
                          than, and offset from, the raster image sitting in the
                          padded content box, so every unit shape would drift off the
                          drawing under it. Both now share this one unpadded box. */}
                      <div className="relative h-full w-full">
                        <img
                          src={plan.src}
                          srcSet={plan.srcSet}
                          sizes="66vw"
                          width={plan.width}
                          height={plan.height}
                          alt={`${plate?.label ?? zone.label} — architectural plan`}
                          decoding="async"
                          loading="lazy"
                          className="h-full w-full object-contain"
                        />
                        {/* Vector overlay traced over the raster drawing above — same
                            plate, at the same aspect ratio, but split into one
                            clickable shape per office. Invisible at rest, so the
                            brochure drawing reads exactly as before; a copper wash on
                            hover marks which unit a click will open. */}
                        {planSvg ? (
                          <FloorPlanOverlay
                            src={planSvg}
                            onSelectUnit={(unitId, bearingDeg) => onOpenView(zone.id, unitId, bearingDeg)}
                          />
                        ) : null}
                      </div>
                    </div>
                    <span
                      aria-hidden="true"
                      className={`block h-px w-full shrink-0 bg-blade-copper/30 max-md:hidden ${
                        planFullscreen ? 'hidden' : ''
                      }`}
                    />
                    <ReraTable plate={plate} className={`max-md:hidden ${planFullscreen ? 'hidden' : ''}`} />
                  </>
                ) : (
                  <div className="row-span-2 min-h-0">
                    <AmenityCard zone={zone} />
                  </div>
                )}
              </div>
            );
          })}

          {shown === null ? (
            <div className="absolute inset-[2.5%] flex flex-col items-center justify-center gap-[1.1em] bg-blade-black-2 text-center">
              {/* Soft blurred halo hugging each hairline, brightest at the shared
                  corner and fading along the edge — not a separate glow shape. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 w-2 blur-md"
                style={{
                  background:
                    'linear-gradient(to top, rgb(240 231 211 / 0.65) 0%, rgb(202 142 91 / 0.3) 25%, transparent 75%)',
                }}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-2 blur-md"
                style={{
                  background:
                    'linear-gradient(to right, rgb(240 231 211 / 0.65) 0%, rgb(202 142 91 / 0.3) 25%, transparent 75%)',
                }}
              />
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-px"
                style={{
                  background:
                    'linear-gradient(to top, var(--color-blade-cream) 0%, var(--color-blade-copper) 30%, transparent 88%)',
                }}
              />
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-px"
                style={{
                  background:
                    'linear-gradient(to right, var(--color-blade-cream) 0%, var(--color-blade-copper) 30%, transparent 88%)',
                }}
              />
              <TowerIcon size="3.6em" className="text-blade-copper" />
              <p className="text-headline font-medium uppercase text-blade-cream">
                Pick any floor from tower
              </p>
              <span className="text-body uppercase tracking-[0.2em] text-blade-copper">
                To get the floor plans.
              </span>
            </div>
          ) : null}

          <PlateWipeCanvas ref={wipe} />

          {/* Fullscreen just the plan panel — same requestFullscreen trick as Gallery's
              render view. Only offered when a real floor plate is on screen; the tower
              prompt and amenity cards have nothing worth expanding. */}
          {shownHasPlan && !comparing ? (
            <button
              type="button"
              onClick={togglePlanFullscreen}
              aria-label={planFullscreen ? 'Exit fullscreen' : 'View plan fullscreen'}
              className="group/pfs absolute right-[1.1em] top-[0.75em] z-[60] flex items-center justify-center bg-blade-black/55 p-[0.55em] text-blade-cream/85 transition-colors duration-200 hover:bg-blade-black/75 hover:text-blade-cream"
            >
              {planFullscreen ? (
                <CloseIcon size="1.2em" />
              ) : (
                <FullscreenIcon
                  size="1.2em"
                  className="transition-transform duration-200 ease-out group-hover/pfs:scale-110"
                />
              )}
            </button>
          ) : null}
        </div>
      </div>


      <ComparePrompt
        innerRef={prompt}
        picks={picks}
        onRemove={removePick}
        onCompare={openDeck}
        onCancel={() => setCompare('closing')}
      />

      {/* Hidden on the wrapper, not on the deck: an `absolute inset-0` box that stayed
          visible would swallow every click meant for the tower behind it. */}
      <div ref={deck} className="screen-inset invisible absolute inset-0 z-30 opacity-0">
        <CompareDeck
          ids={picks}
          onClose={() => setCompare('closing')}
          onEdit={() => setCompare('picking')}
        />
      </div>

      <UnitPanoramaViewer
        view={activeView}
        panorama={getFloorPanorama(activeView?.zoneId)}
        onClose={closeView}
      />

    </Screen>
  );
}
