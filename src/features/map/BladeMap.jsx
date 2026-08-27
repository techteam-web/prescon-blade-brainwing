import { useCallback, useRef, useState } from 'react';
import { gsap, useGSAP, E, prefersReducedMotion } from '../../gsap/Gsapconfig';
import { useIdleTask } from '../../hooks/useEventListener';
import { PROJECT, LANDMARKS, ALWAYS_ON } from '../../data/landmarks';
import { ROUTE_STYLES } from '../../data/routes';
import { CORRIDORS } from '../../data/corridors';
import { CONNECTIVITY_BY_ID } from '../../data/connectivity';
import { TOWER_ELEVATION } from '../../data/planAssets';
import { buildMapStyle } from './mapStyle';
import { fetchRoute } from './routing';

// MapLibre is imported dynamically so ~1 MB of map code and CSS stays out of the initial
// bundle, and it mounts only on the first visit to this section.
//
// Fully interactive: drag to pan, wheel to zoom, right-drag or two fingers to pitch and
// rotate. Pitch opens at 48° so it reads as a place rather than a diagram.

const HOME = { center: [PROJECT.lng, PROJECT.lat], zoom: 11.6, bearing: -18, pitch: 48 };

// The marker is a fixed-pixel HTML element, so its own on-screen size never moves with
// the camera — zooming in on the neighbourhood left the tower exactly as big as it was
// at the city-wide HOME view, reading as it shrinking relative to the roads and
// buildings growing in around it. This ties its scale to zoom instead: 1x (150px) at
// HOME, ramping up as the camera gets closer, capped at 700px so it stays prominent
// once a route pulls the camera in tight, without blowing past a sane size.
const TOWER_HOME_HEIGHT = 150;
const TOWER_MAX_HEIGHT = 700;
const TOWER_SCALE_MAX = TOWER_MAX_HEIGHT / TOWER_HOME_HEIGHT;
const TOWER_SCALE_ZOOM_SPAN = 4;
// Clicking a destination flies the camera in via fitBounds, which frames the route and
// lands close to this span's own cap (its own maxZoom is 15.5, right under HOME.zoom +
// TOWER_SCALE_ZOOM_SPAN) — so the tower already read as maxed-out the instant a route
// appeared, before the visitor asked to see it that big by zooming in themselves. Only
// that automatic flight gets its growth dampened; a manual zoom to the same camera
// position still reaches full size.
const ROUTE_TOWER_DAMPEN = 0.7;
// The marker's own visual stack above its anchor point, in CSS pixels, at scale 1 —
// --tower-base-bottom (15px) + the label's 8px clearance + the label's own ~47px height
// (map.css). fitRoute reads this to keep the fitBounds top padding wide enough that a
// tall marker never runs off the top of the map — see there for why.
const TOWER_LABEL_STACK = 70;
const towerScale = (zoom, dampen = 1) => {
  const t = Math.min(1, Math.max(0, (zoom - HOME.zoom) / TOWER_SCALE_ZOOM_SPAN));
  // Eased (t⁴), not linear or t²: at the full 700px cap, a gentler ease (t², or linear)
  // already reaches most of that size well before the camera is actually all the way in,
  // so the tower read as oversized mid-zoom instead of growing into its size right at the
  // end. The steeper curve keeps growth flat for most of the zoom range and saves it for
  // the final approach to max zoom.
  const e = t * t * t * t;
  return 1 + e * (TOWER_SCALE_MAX - 1) * dampen;
};

const ROUTE_SRC = 'blade-route';
const EMPTY = { type: 'FeatureCollection', features: [] };
const lineFeature = (coordinates) => ({
  type: 'FeatureCollection',
  features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates } }],
});

// Marching dashes. Cycling the phase shifts the gap, so the bright overlay appears to
// travel toward the destination — the Google-directions read, done with paint only.
const DASH_STEPS = [
  [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5],
  [3, 4, 0], [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5],
  [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5],
];

const CORRIDOR_LAYERS = Object.keys(ROUTE_STYLES).flatMap((id) => [
  `route-${id}`,
  `route-${id}-casing`,
  `route-${id}-pulse`,
]);

// Opacity is STATE, not a constant, and it has to live somewhere both fades can read.
//
// The bug this fixes: both fades used to be `gsap.to({o: <hardcoded start>}, ...)` on a
// throwaway object. Selecting a second landmark while a route was already drawn ran the
// corridor fade-out from a hardcoded 0.9 even though the corridors were sitting at 0 —
// so the first frame of the tween wrote 0.9, every coloured corridor flashed back on for
// an instant, and then faded away again. The route fade had the same fault in the other
// direction. Tweening a PERSISTENT object instead means every fade starts from wherever
// the layers actually are, and `overwrite` kills whatever was mid-flight.
const CORRIDOR_ON = 0.9;

export function BladeMap({ activeCategory, focusId, highlightId, onRoute }) {
  const host = useRef(null);
  const map = useRef(null);
  const markers = useRef(new Map());
  const dashRaf = useRef(0);
  const corridorTicker = useRef(null);
  const abort = useRef(null);
  const corridorFade = useRef({ o: 0 });
  const routeFade = useRef({ o: 0 });
  const hasFocused = useRef(false);
  // Read by applyTowerScale (set up once, inside the 'load' handler) so it can tell a
  // manual zoom from the camera's own fitBounds flight to a clicked destination — see
  // ROUTE_TOWER_DAMPEN below.
  const routeActive = useRef(false);
  // The marker planted at the clicked destination's own coordinate, carrying its name —
  // the route line alone never said WHERE it ended, only the side panel did.
  const destMarker = useRef(null);
  const destMarkerTimeout = useRef(0);
  const [loaded, setLoaded] = useState(false);

  useIdleTask(() => {
    let cancelled = false;
    let observer = null;

    (async () => {
      const [mod] = await Promise.all([
        import('maplibre-gl'),
        import('maplibre-gl/dist/maplibre-gl.css'),
      ]);
      const maplibregl = mod.default ?? mod;
      if (cancelled || !host.current || map.current) return;

      const m = new maplibregl.Map({
        container: host.current,
        style: buildMapStyle(),
        ...HOME,
        attributionControl: { compact: true },
        scrollZoom: true,
        dragRotate: true,
        touchPitch: true,
        doubleClickZoom: true,
        keyboard: false,
        maxPitch: 70,
        minZoom: 9,
        maxZoom: 17,
      });

      m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
      m.on('error', (e) => console.error('[map]', e?.error?.message ?? e));

      // Publish and size the map NOW. MapLibre computes its tile cover from its own
      // transform, which stays 0×0 until resize() is called — if resize() were only
      // reachable from the 'load' handler, the map would never request a tile, so 'load'
      // would never fire. That deadlock reads as a black map with no error at all.
      map.current = { maplibregl, m };
      m.resize();

      const ro = new ResizeObserver(() => m.resize());
      ro.observe(host.current);
      observer = ro;

      m.on('load', () => {
        if (cancelled) return;

        m.addSource('corridors', { type: 'geojson', data: CORRIDORS, lineMetrics: true });
        m.addSource(ROUTE_SRC, { type: 'geojson', data: EMPTY });

        // Every corridor layer is BORN at opacity 0 and is brought up by the same fade
        // that lowers it later. Painting them in at full strength and then starting the
        // fade-in from 0 made the corridors blink off for one frame the moment the map
        // finished loading.
        for (const [id, s] of Object.entries(ROUTE_STYLES)) {
          if (s.casing) {
            m.addLayer({
              id: `route-${id}-casing`,
              type: 'line',
              source: 'corridors',
              filter: ['==', ['get', 'id'], id],
              layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: { 'line-color': s.casing, 'line-width': s.width + 2.4, 'line-opacity': 0 },
            });
          }
          m.addLayer({
            id: `route-${id}`,
            type: 'line',
            source: 'corridors',
            filter: ['==', ['get', 'id'], id],
            layout: { 'line-cap': s.dash ? 'butt' : 'round', 'line-join': 'round' },
            paint: {
              'line-color': s.color,
              'line-width': s.width,
              'line-opacity': 0,
              ...(s.dash ? { 'line-dasharray': s.dash } : {}),
            },
          });
          m.addLayer({
            id: `route-${id}-pulse`,
            type: 'line',
            source: 'corridors',
            filter: ['==', ['get', 'id'], id],
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-width': s.width + 1.2,
              'line-opacity': 0,
              'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0)'],
            },
          });
        }

        // The directions route, in four passes: halo, dark casing, the path, and white
        // dashes marching toward the destination.
        m.addLayer({
          id: 'dir-glow',
          type: 'line',
          source: ROUTE_SRC,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#F0E7D3', 'line-width': 18, 'line-opacity': 0, 'line-blur': 12 },
        });
        m.addLayer({
          id: 'dir-case',
          type: 'line',
          source: ROUTE_SRC,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#12100E', 'line-width': 10, 'line-opacity': 0 },
        });
        m.addLayer({
          id: 'dir-base',
          type: 'line',
          source: ROUTE_SRC,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#CA8E5B', 'line-width': 5, 'line-opacity': 0 },
        });
        m.addLayer({
          id: 'dir-flow',
          type: 'line',
          source: ROUTE_SRC,
          layout: { 'line-cap': 'butt', 'line-join': 'round' },
          paint: { 'line-color': '#FFF6E6', 'line-width': 5, 'line-opacity': 0, 'line-dasharray': [0, 4, 3] },
        });

        const projectEl = document.createElement('div');
        projectEl.className = 'blade-project';
        projectEl.innerHTML =
          '<span class="blade-project__halo" data-halo></span>' +
          '<span class="blade-project__ring"></span>' +
          `<img class="blade-project__tower" src="${TOWER_ELEVATION.src}" alt="" />` +
          '<img class="blade-project__label" src="/assets/tower/theblade.png" alt="The Blade" />';
        new maplibregl.Marker({ element: projectEl, anchor: 'bottom' })
          .setLngLat([PROJECT.lng, PROJECT.lat])
          .addTo(m);

        const applyTowerScale = () => {
          const dampen = routeActive.current ? ROUTE_TOWER_DAMPEN : 1;
          projectEl.style.setProperty('--tower-scale', String(towerScale(m.getZoom(), dampen)));
        };
        applyTowerScale();
        m.on('zoom', applyTowerScale);

        for (const l of LANDMARKS) {
          const el = document.createElement('div');
          el.className = 'blade-landmark';
          // Emphasis landmarks — junctions and named places that have to read on the map
          // on their own, rather than waiting for hover like every other chip — see the
          // `emphasis: true` entries in src/data/landmarks.js.
          if (l.emphasis) el.classList.add('blade-landmark--emphasis');
          if (l.labelSide === 'left') el.classList.add('blade-landmark--label-left');
          // labelDx/labelDy: a manual nudge for labels whose dots sit too close to a
          // neighbour's to both read at once — currently only the 'roads' cluster
          // (see the comment on it in landmarks.js). Every other landmark leaves
          // these unset, so the CSS default of 0 applies and nothing about its
          // position changes.
          const labelStyle =
            l.labelDx || l.labelDy
              ? ` style="--label-dx:${l.labelDx ?? 0}px; --label-dy:${l.labelDy ?? 0}px;"`
              : '';
          el.innerHTML =
            '<span class="blade-landmark__dot"></span>' +
            '<span class="blade-landmark__particle" style="--a: 20deg"></span>' +
            '<span class="blade-landmark__particle" style="--a: 150deg"></span>' +
            '<span class="blade-landmark__particle" style="--a: 260deg"></span>' +
            `<span class="blade-landmark__label"${labelStyle}>${l.name}</span>`;
          new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([l.lng, l.lat])
            .addTo(m);
          markers.current.set(l.id, el);
        }

        // Light travelling along each corridor, offset per corridor so they never march
        // in lockstep.
        //
        // Throttled to a fixed cadence rather than riding gsap.ticker's raw rAF rate —
        // uncapped that recomputed and wrote a paint property on all seven corridor
        // layers every display refresh (144/sec on a high-refresh monitor), which is pure
        // main-thread cost competing with an in-progress drag/pan for no visible gain: a
        // marching-light effect doesn't read any smoother above ~24 steps/sec. It also
        // skips entirely while the corridors are faded out (a route is on screen) —
        // updating paint properties nobody can see wasted the same time doing nothing.
        if (!prefersReducedMotion()) {
          const ids = Object.keys(ROUTE_STYLES);
          const t = { v: 0 };
          let last = 0;
          const STEP_MS = 1000 / 24;
          const tick = (_time, deltaMs) => {
            if (corridorFade.current.o <= 0) return;
            last += deltaMs;
            if (last < STEP_MS) return;
            last = 0;
            t.v = (t.v + 0.0022 * (STEP_MS / 16.67)) % 1;
            ids.forEach((id, k) => {
              const head = (t.v + k / ids.length) % 1;
              if (!m.getLayer(`route-${id}-pulse`)) return;
              m.setPaintProperty(`route-${id}-pulse`, 'line-gradient', [
                'interpolate', ['linear'], ['line-progress'],
                0, 'rgba(0,0,0,0)',
                Math.max(0.0001, head - 0.12), 'rgba(0,0,0,0)',
                head, 'rgba(240,231,211,0.85)',
                Math.min(0.9999, head + 0.02), 'rgba(0,0,0,0)',
                1, 'rgba(0,0,0,0)',
              ]);
            });
          };
          gsap.ticker.add(tick);
          corridorTicker.current = tick;
        }

        setLoaded(true);
      });
    })();

    return () => {
      cancelled = true;
      observer?.disconnect();
      abort.current?.abort();
      cancelAnimationFrame(dashRaf.current);
      clearTimeout(destMarkerTimeout.current);
      destMarker.current = null;
      gsap.killTweensOf([corridorFade.current, routeFade.current]);
      if (corridorTicker.current) gsap.ticker.remove(corridorTicker.current);
      map.current?.m?.remove?.();
      map.current = null;
    };
  });

  useGSAP(
    () => {
      if (!loaded) return;
      const halo = document.querySelector('.blade-project [data-halo]');
      if (!halo) return;
      gsap.set(halo, { scale: 1, opacity: 0.5, transformOrigin: 'center center' });
      gsap.to(halo, { scale: 1.6, opacity: 0, duration: 2.6, ease: E.out, repeat: -1 });
    },
    { dependencies: [loaded] },
  );

  useGSAP(
    () => {
      if (!map.current) return;
      // Clicking a destination (a CONNECTIVITY row — it's what sets focusId and draws
      // the route) surfaces ONLY the one road it's nearest to (CONNECTIVITY_BY_ID[id]
      // .road, see the comment on that field in connectivity.js), not the whole set —
      // the route is easier to read against the specific street it runs along, not
      // every road in the area at once.
      const focusedRoad = focusId ? CONNECTIVITY_BY_ID[focusId]?.road : null;
      for (const l of LANDMARKS) {
        const el = markers.current.get(l.id);
        const isFocusedRoad = l.cat === 'roads' && l.id === focusedRoad;
        // No filter picked yet is NOT "show everything" — only the always-on landmarks
        // (junctions, transit, the emphasis set in landmarks.js) show until a category is
        // actually clicked; every other landmark stays dim until its own filter is on.
        const on = l.cat === activeCategory || ALWAYS_ON.has(l.cat) || isFocusedRoad;
        if (el) el.setAttribute('data-dim', String(!on));
        // Roads have no CONNECTIVITY row of their own to hover (see connectivity.js),
        // so hover-to-reveal — every other category's mechanism — has no way to
        // trigger. A road's name stays on for as long as the Roads filter itself is
        // on, or its own linked destination is focused, same as an always-on
        // 'emphasis' landmark.
        if (el) el.setAttribute('data-labelled', String(l.cat === 'roads' && (activeCategory === 'roads' || isFocusedRoad)));
      }
    },
    { dependencies: [activeCategory, focusId, loaded] },
  );

  useGSAP(
    () => {
      for (const [id, el] of markers.current) {
        el.setAttribute('data-active', String(id === highlightId));
      }
    },
    { dependencies: [highlightId, loaded] },
  );

  /* ------------------------------------------------------------- directions */

  const setCorridors = useCallback((m, visible) => {
    // When a route is on screen the corridors get out of the way entirely — two sets of
    // coloured lines at once is unreadable, and the route is the answer to the question
    // that was just asked.
    const state = corridorFade.current;
    gsap.to(state, {
      o: visible ? CORRIDOR_ON : 0,
      duration: 0.45,
      ease: E.out,
      overwrite: true,
      onUpdate() {
        for (const id of CORRIDOR_LAYERS) {
          if (m.getLayer(id)) m.setPaintProperty(id, 'line-opacity', state.o);
        }
      },
    });
  }, []);

  const startDashes = useCallback((m) => {
    cancelAnimationFrame(dashRaf.current);
    if (prefersReducedMotion()) return;
    let step = -1;
    const tick = () => {
      const next = Math.floor((performance.now() / 55) % DASH_STEPS.length);
      if (next !== step) {
        step = next;
        if (m.getLayer('dir-flow')) m.setPaintProperty('dir-flow', 'line-dasharray', DASH_STEPS[step]);
      }
      dashRaf.current = requestAnimationFrame(tick);
    };
    dashRaf.current = requestAnimationFrame(tick);
  }, []);

  const showDestMarker = useCallback((maplibregl, m, dest) => {
    clearTimeout(destMarkerTimeout.current);
    destMarker.current?.remove();

    const el = document.createElement('div');
    el.className = 'blade-dest';
    el.innerHTML =
      '<span class="blade-marker__dot"></span>' +
      '<span class="blade-marker__particle" style="--a: 20deg"></span>' +
      '<span class="blade-marker__particle" style="--a: 150deg"></span>' +
      '<span class="blade-marker__particle" style="--a: 260deg"></span>' +
      `<span class="blade-place">${dest.label}</span>`;
    destMarker.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat(dest.at)
      .addTo(m);

    // Born invisible and flipped to visible next frame so the opacity transition in
    // map.css actually has a 0 -> 1 change to animate, instead of painting in at full
    // strength on the same frame the marker is added.
    requestAnimationFrame(() => el.setAttribute('data-visible', 'true'));
  }, []);

  const hideDestMarker = useCallback(() => {
    const marker = destMarker.current;
    if (!marker) return;
    destMarker.current = null;
    marker.getElement().setAttribute('data-visible', 'false');
    clearTimeout(destMarkerTimeout.current);
    destMarkerTimeout.current = window.setTimeout(() => marker.remove(), 350);
  }, []);

  const fadeRoute = useCallback((m, to) => {
    const state = routeFade.current;
    gsap.to(state, {
      o: to ? 1 : 0,
      duration: to ? 0.6 : 0.4,
      ease: E.out,
      overwrite: true,
      onUpdate() {
        if (!m.getLayer('dir-base')) return;
        m.setPaintProperty('dir-glow', 'line-opacity', 0.2 * state.o);
        m.setPaintProperty('dir-case', 'line-opacity', 0.9 * state.o);
        m.setPaintProperty('dir-base', 'line-opacity', state.o);
        m.setPaintProperty('dir-flow', 'line-opacity', 0.95 * state.o);
      },
      onComplete() {
        if (!to) m.getSource(ROUTE_SRC)?.setData(EMPTY);
      },
    });
  }, []);

  useGSAP(
    () => {
      const ctx = map.current;
      if (!ctx || !loaded) return;
      const { maplibregl, m } = ctx;

      abort.current?.abort();
      const dest = focusId ? CONNECTIVITY_BY_ID[focusId] : null;
      routeActive.current = !!dest;

      if (!dest) {
        cancelAnimationFrame(dashRaf.current);
        fadeRoute(m, false);
        setCorridors(m, true);
        hideDestMarker();
        onRoute?.(null);
        // Only fly home if we ever left. This branch also runs once when the map first
        // loads, and a 1.4s camera move to the position the camera is already in wastes
        // the entrance and fights the screen transition.
        if (hasFocused.current) {
          m.easeTo({ ...HOME, duration: 1400, easing: (t) => 1 - Math.pow(1 - t, 3) });
        }
        return;
      }

      hasFocused.current = true;
      const controller = new AbortController();
      abort.current = controller;
      onRoute?.({ id: dest.id, label: dest.label, state: 'loading' });
      showDestMarker(maplibregl, m, dest);

      fetchRoute(dest.at, controller.signal)
        .then(({ coordinates, distance, duration }) => {
          if (controller.signal.aborted || !m.getSource(ROUTE_SRC)) return;
          m.getSource(ROUTE_SRC).setData(lineFeature(coordinates));
          setCorridors(m, false);
          fadeRoute(m, true);
          startDashes(m);
          onRoute?.({ id: dest.id, label: dest.label, state: 'ready', distance, duration });

          const bounds = new maplibregl.LngLatBounds(coordinates[0], coordinates[0]);
          for (const c of coordinates) bounds.extend(c);

          // The tower is a fixed-pixel marker anchored at PROJECT's coordinate, growing
          // tall via CSS transform — fitBounds only knows about the route's geometry, not
          // that stack of pixels standing on top of one of its own points. A short, nearby
          // destination fits at a tight zoom where the marker is close to its max height,
          // and with only the route's own padding it ran clean off the top of the map.
          // Preview the zoom fitBounds would pick, work out how tall the marker stands at
          // that zoom, and reserve that much top padding before doing the real, animated
          // fit — a route already using more top padding than that is left untouched.
          const basePadding = fitPadding();
          const preview = m.cameraForBounds(bounds, { padding: basePadding, maxZoom: 15.5, pitch: 52 });
          const markerClearance =
            TOWER_HOME_HEIGHT * towerScale(preview?.zoom ?? m.getZoom(), ROUTE_TOWER_DAMPEN) + TOWER_LABEL_STACK;
          const padding = { ...basePadding, top: Math.max(basePadding.top, markerClearance + 24) };

          m.fitBounds(bounds, {
            duration: 1500,
            padding,
            maxZoom: 15.5,
            pitch: 52,
            easing: (t) => 1 - Math.pow(1 - t, 3),
          });
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          console.error('[map] route', err);
          onRoute?.({ id: dest.id, label: dest.label, state: 'error' });
        });
    },
    { dependencies: [focusId, loaded] },
  );

  const setHost = useCallback((el) => {
    host.current = el;
  }, []);

  // A map pans: its canvas and markers extend past the viewport by design.
  return <div ref={setHost} data-overflow-ok className="blade-map" aria-label="Map of Worli Naka, Mumbai" />;
}

// The panel sits OVER the map on wide screens, so the route has to be framed clear of it.
// On a phone the map element is already cut short above the docked panel, so padding
// there only needs to clear the top nav — reserving space for the panel as well would
// double-count it and squeeze the route off screen entirely.
function fitPadding() {
  const w = window.innerWidth;
  if (w < 768) return { top: 96, bottom: 56, left: 28, right: 28 };
  if (w < 1280) return { top: 110, bottom: 150, left: 330, right: 80 };
  return { top: 130, bottom: 150, left: 430, right: 110 };
}
