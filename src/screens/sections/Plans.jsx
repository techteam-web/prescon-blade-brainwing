import { useCallback, useMemo, useRef, useState } from 'react';
import { Screen } from '../../layout/Screen';
import { SectionTitle } from './SectionShell';
import { TowerElevation } from '../../features/plans/TowerElevation';
import { ReraTable } from '../../features/plans/ReraTable';
<<<<<<< HEAD
import { FloorCompare } from '../../features/plans/FloorCompare';
import { TOWER_ZONES, ZONE_BY_ID, MAX_COMPARE } from '../../data/towerZones';
=======
import { CompareDeck } from '../../features/plans/CompareDeck';
import { TOWER_ZONES, ZONE_BY_ID } from '../../data/towerZones';
>>>>>>> origin/main
import { getPlate } from '../../data/floorPlates';
import { getPlan, PLAN_ASSETS, TOWER_ELEVATION } from '../../data/planAssets';
import { CONTENT } from '../../data/content';
import { gsap, useGSAP, E } from '../../gsap/Gsapconfig';
import { useIdleTask } from '../../hooks/useEventListener';
<<<<<<< HEAD
import { CloseIcon } from '../../components/Icons';
=======
>>>>>>> origin/main
import { useApp } from '../../app/appContext';

// Tower left ~34%, plan panel right ~66%.
//
// Hover swaps the right panel with a 120ms debounce, so sweeping the pointer up the
// tower does not thrash through nine plate swaps. Click locks the selection. Service and
// amenity floors have no plate and swap to an amenity card instead — the panel is never
// empty.
//
// COMPARE MODE is the screen's second state, opened from the rail. The tower leaves its
// column, centres on the page and grows; up to three floors are picked off it; the tower
// then dissolves and the picked plates rise in side by side. Closing reverses the whole
// thing. The state machine lives in AppState (the control is in the rail, which knows
// nothing about screens); everything else — the picks and all of the motion — is here.

const DEBOUNCE = 120;
const FIRST = TOWER_ZONES.find((z) => z.plan)?.id ?? TOWER_ZONES[0].id;
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
  const panel = CONTENT.amenities.find((a) => a.id === zone.amenity);
  return (
    <div className="flex h-full min-h-0 flex-col justify-center gap-[1em] bg-plan-canvas p-[6%] text-blade-cocoa">
      <span className="text-caption uppercase tracking-[0.24em] text-blade-terracotta">
        {zone.floors}
      </span>
      <h2 className="text-headline uppercase">{zone.label}</h2>
      <span aria-hidden="true" className="h-px w-[34%] bg-blade-copper" />
      {panel ? (
        <>
          <p className="max-w-[54ch] text-caption">{panel.body}</p>
          {panel.list ? (
            <ul className="flex flex-wrap gap-x-[1.2em] gap-y-[0.3em]">
              {panel.list.map((item) => (
                <li key={item} className="text-caption text-blade-cocoa/75">
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <p className="text-caption text-blade-cocoa/70">
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

        <p className="text-caption leading-[1.4] text-blade-cream/70">
          Choose up to three floors on the tower.
        </p>

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
  const { compareIds, compareOpen, setCompareOpen, toggleCompare, removeCompare } = useApp();
  const [hovered, setHovered] = useState(null);
  const [locked, setLocked] = useState(FIRST);
  const [shown, setShown] = useState(FIRST);
  const [picks, setPicks] = useState([]);
  const timer = useRef(null);
  const frame = useRef(null);
  const tower = useRef(null);
  const title = useRef(null);
  const scrim = useRef(null);
  const prompt = useRef(null);
  const deck = useRef(null);

  const firstPaint = useRef(true);
  const prevShown = useRef(FIRST);
  const prevCompare = useRef('off');
  const fit = useRef({ x: 0, y: 0, scale: 1 });

  const { compare, setCompare } = useApp();
  const comparing = compare !== 'off';

  usePreloadPlans();

  const request = useCallback((id) => {
    window.clearTimeout(timer.current);
    if (!id) return;
    timer.current = window.setTimeout(() => setShown(id), DEBOUNCE);
  }, []);

  const onHover = useCallback(
    (id) => {
      setHovered(id);
      request(id);
    },
    [request],
  );

  const onSelect = useCallback(
    (id) => {
      window.clearTimeout(timer.current);
      setLocked(id);
      setShown(id);
    },
    [],
  );

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
  // screen mounts. Later swaps move `transform` and `opacity` only: the previous version
  // also tweened `clip-path` on a box holding a 4952px drawing, which repaints the whole
  // subtree every frame for no visual gain over a slide.
  useGSAP(
    () => {
      const root = frame.current;
      if (!root) return;
      const layers = Array.from(root.querySelectorAll('[data-plate]'));
      const incoming = layers.find((l) => l.dataset.plate === shown);
      const leaving = prevShown.current;
      prevShown.current = shown;

      if (firstPaint.current) {
        firstPaint.current = false;
        for (const layer of layers) {
          const on = layer === incoming;
          gsap.set(layer, { autoAlpha: on ? 1 : 0, x: 0, pointerEvents: on ? 'auto' : 'none' });
        }
        return;
      }
      if (shown === leaving) return;

      const back = layers.indexOf(incoming) < layers.findIndex((l) => l.dataset.plate === leaving);
      const dir = back ? -1 : 1;

      for (const layer of layers) {
        if (layer === incoming) continue;
        gsap.to(layer, {
          x: -46 * dir,
          autoAlpha: 0,
          pointerEvents: 'none',
          duration: 0.42,
          ease: E.in,
          overwrite: 'auto',
        });
      }
      if (incoming) {
        gsap.fromTo(
          incoming,
          { x: 46 * dir, autoAlpha: 0 },
          {
            x: 0,
            autoAlpha: 1,
            pointerEvents: 'auto',
            duration: 0.62,
            ease: E.out,
            overwrite: 'auto',
          },
        );
      }
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
<<<<<<< HEAD
  const compareZones = TOWER_ZONES.filter((z) => compareIds.includes(z.id));
=======
  const zoneList = useMemo(() => (comparing ? COMPARABLE : TOWER_ZONES), [comparing]);
>>>>>>> origin/main

  return (
    <Screen id="plans">
      {/* Compare mode's ground. Behind the tower, over everything else. */}
      <div
        ref={scrim}
        aria-hidden="true"
        className="invisible pointer-events-none absolute inset-0 z-10 bg-blade-black/78 opacity-0 backdrop-blur-[2px]"
      />

      <div className="grid h-full min-h-0 grid-cols-[34fr_66fr] gap-[3%] max-md:grid-cols-1 max-md:grid-rows-[32%_68%] max-md:gap-[2%]">
        <div className="flex min-h-0 flex-col gap-[1em]">
          <div ref={title}>
            <SectionTitle id="plans" />
          </div>
          <div
            ref={tower}
            data-stagger
            className="relative min-h-0 flex-1"
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
            />

            {/* The label chip — one of the three permitted glass surfaces. Compare mode
                hides it: the prompt is already naming every floor that matters. */}
            {chip && !comparing ? (
              <div
                className="glass pointer-events-none absolute right-0 flex flex-col gap-[0.2em] px-[0.9em] py-[0.5em]"
                style={{
                  top: `${chip.shape.y + chip.shape.h / 2}%`,
                  transform: 'translateY(-50%)',
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
            ) : null}

            {/* The compare tray — floor plates picked via the "Compare" toggle on the
                panel opposite. Sits over the tower's own lowest bands rather than
                claiming a layout row of its own, so adding a floor never resizes it. */}
            {compareZones.length > 0 ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-[0.6em]">
                {compareZones.map((zone) => (
                  <span
                    key={zone.id}
                    className="pointer-events-auto flex items-center gap-[0.5em] border border-blade-ink bg-blade-black-2 px-[0.7em] py-[0.35em] text-caption uppercase tracking-[0.1em] text-blade-cream"
                  >
                    {zone.label}
                    <button
                      type="button"
                      onClick={() => removeCompare(zone.id)}
                      aria-label={`Remove ${zone.label} from compare`}
                      className="text-blade-cream/50 transition-colors duration-200 hover:text-blade-copper"
                    >
                      <CloseIcon size="0.8em" />
                    </button>
                  </span>
                ))}
                {compareZones.length >= 2 ? (
                  <button
                    type="button"
                    onClick={() => setCompareOpen(true)}
                    className="pointer-events-auto border border-blade-copper px-[0.9em] py-[0.35em] text-caption uppercase tracking-[0.14em] text-blade-copper transition-colors duration-200 hover:bg-blade-copper hover:text-blade-black"
                  >
                    Compare ({compareZones.length})
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div ref={frame} data-stagger className="relative min-h-0 min-w-0">
          {TOWER_ZONES.map((zone) => {
            const plan = getPlan(zone.plan);
            const plate = getPlate(zone.plan);
            return (
              <div
                key={zone.id}
                data-plate={zone.id}
                aria-hidden={shown !== zone.id}
                // The resting state is declared here as well as set by GSAP: the class
                // wins on the very first paint, before any script has run.
                className={`absolute inset-0 grid min-h-0 grid-rows-[auto_1fr_auto] gap-[0.8em] overflow-hidden ${
                  zone.id === FIRST ? '' : 'invisible opacity-0'
                }`}
              >
                <div className="flex items-baseline gap-[1.4em]">
                  <h2 className="text-subhead font-medium uppercase text-blade-cream">
                    {plate?.label ?? zone.label}
                  </h2>

                  {plate ? (
                    <button
                      type="button"
                      onClick={() => toggleCompare(zone.id)}
                      aria-pressed={compareIds.includes(zone.id)}
                      disabled={!compareIds.includes(zone.id) && compareIds.length >= MAX_COMPARE}
                      className={`group flex shrink-0 items-center gap-[0.5em] text-caption uppercase tracking-[0.16em] transition-colors duration-200 disabled:pointer-events-none disabled:opacity-30 ${
                        compareIds.includes(zone.id)
                          ? 'text-blade-copper'
                          : 'text-blade-cream/55 hover:text-blade-cream'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`inline-block size-[0.85em] border ${
                          compareIds.includes(zone.id)
                            ? 'border-blade-copper bg-blade-copper'
                            : 'border-blade-cream/40'
                        }`}
                      />
                      Compare
                    </button>
                  ) : null}
                </div>

                {plan ? (
                  <>
                    <div className="relative min-h-0 bg-plan-canvas p-[2.5%]">
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
                    </div>
                    <ReraTable plate={plate} className="bg-plan-canvas p-[1.4%] max-md:hidden" />
                  </>
                ) : (
                  <div className="row-span-2 min-h-0">
                    <AmenityCard zone={zone} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

<<<<<<< HEAD
      {compareOpen && compareZones.length >= 2 ? (
        <FloorCompare
          zones={compareZones}
          onClose={() => setCompareOpen(false)}
          onRemove={(id) => {
            removeCompare(id);
            if (compareZones.length - 1 < 2) setCompareOpen(false);
          }}
        />
      ) : null}
=======
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
>>>>>>> origin/main
    </Screen>
  );
}
