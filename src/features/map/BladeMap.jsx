import { useCallback, useRef, useState } from 'react';
import { gsap, useGSAP, E, prefersReducedMotion } from '../../gsap/Gsapconfig';
import { useIdleTask } from '../../hooks/useEventListener';
import { PROJECT, LANDMARKS, ALWAYS_ON } from '../../data/landmarks';
import { ROUTE_STYLES } from '../../data/routes';
import { CORRIDORS } from '../../data/corridors';
import { CONNECTIVITY_BY_ID } from '../../data/connectivity';
import { buildMapStyle } from './mapStyle';
import { fetchRoute } from './routing';

// MapLibre is imported dynamically so ~1 MB of map code and CSS stays out of the initial
// bundle, and it mounts only on the first visit to this section.
//
// Fully interactive: drag to pan, wheel to zoom, right-drag or two fingers to pitch and
// rotate. Pitch opens at 48° so it reads as a place rather than a diagram.

const HOME = { center: [PROJECT.lng, PROJECT.lat], zoom: 11.6, bearing: -18, pitch: 48 };

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
          '<span class="blade-project__shard"></span>' +
          '<span class="blade-project__core"></span>' +
          '<span class="blade-project__label">The Blade</span>';
        new maplibregl.Marker({ element: projectEl, anchor: 'bottom' })
          .setLngLat([PROJECT.lng, PROJECT.lat])
          .addTo(m);

        for (const l of LANDMARKS) {
          const el = document.createElement('div');
          el.className = 'blade-landmark';
          el.innerHTML =
            '<span class="blade-landmark__dot"></span>' +
            `<span class="blade-landmark__label">${l.name}</span>`;
          new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([l.lng, l.lat])
            .addTo(m);
          markers.current.set(l.id, el);
        }

        // Light travelling along each corridor, offset per corridor so they never march
        // in lockstep.
        if (!prefersReducedMotion()) {
          const ids = Object.keys(ROUTE_STYLES);
          const t = { v: 0 };
          const tick = () => {
            t.v = (t.v + 0.0022) % 1;
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
      for (const l of LANDMARKS) {
        const el = markers.current.get(l.id);
        const on = !activeCategory || l.cat === activeCategory || ALWAYS_ON.has(l.cat);
        if (el) el.setAttribute('data-dim', String(!on));
      }
    },
    { dependencies: [activeCategory, loaded] },
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

      if (!dest) {
        cancelAnimationFrame(dashRaf.current);
        fadeRoute(m, false);
        setCorridors(m, true);
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
          m.fitBounds(bounds, {
            duration: 1500,
            padding: fitPadding(),
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
