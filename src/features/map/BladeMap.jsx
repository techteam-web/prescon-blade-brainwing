import { useCallback, useRef, useState } from 'react';
import { gsap, useGSAP, E } from '../../gsap/Gsapconfig';
import { useIdleTask } from '../../hooks/useEventListener';
import { PROJECT, LANDMARKS, ALWAYS_ON } from '../../data/landmarks';
import { ROUTES, ROUTE_STYLES } from '../../data/routes';
import { CONNECTIVITY_BY_ID } from '../../data/connectivity';
import { buildMapStyle } from './mapStyle';

// MapLibre is imported dynamically so ~1 MB of map code and CSS stays out of the initial
// bundle, and it mounts only on the first visit to this section.
//
// The map is fully interactive: drag to pan, wheel to zoom, right-drag or two fingers to
// pitch and rotate into 3D. Pitch opens at 48° so it reads as a place rather than a
// diagram.

const HOME = {
  center: [PROJECT.lng, PROJECT.lat],
  zoom: 11.6,
  bearing: -18,
  pitch: 48,
};

// A great-circle-ish arc between two points, so a connection reads as a flight path
// rather than a ruler line.
function arc(from, to, bend = 0.18, steps = 96) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  // Perpendicular offset for the control point.
  const cx = mx - (y2 - y1) * bend;
  const cy = my + (x2 - x1) * bend;
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push([u * u * x1 + 2 * u * t * cx + t * t * x2, u * u * y1 + 2 * u * t * cy + t * t * y2]);
  }
  return out;
}

export function BladeMap({ activeCategory, focusId, highlightId, onReady }) {
  const host = useRef(null);
  const map = useRef(null);
  const markers = useRef(new Map());
  const [loaded, setLoaded] = useState(false);

  useIdleTask(() => {
    let cancelled = false;
    let observer = null;
    let ticker = null;

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
        attributionControl: { compact: false },
        // Everything on: pan, wheel zoom, pitch and rotate. The brief's no-scroll law is
        // about the page, and the map is not the page — it is an instrument inside it.
        scrollZoom: true,
        dragRotate: true,
        touchPitch: true,
        doubleClickZoom: true,
        keyboard: false, // arrow keys belong to the section navigator
        maxPitch: 70,
        minZoom: 9,
        maxZoom: 17,
      });

      m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

      m.on('error', (e) => console.error('[map]', e?.error?.message ?? e));

      // Publish and size the map NOW. MapLibre computes its tile cover from its own
      // transform, which stays 0×0 until resize() is called — if resize() were only
      // reachable from the 'load' handler, the map would never request a tile, so 'load'
      // would never fire. That deadlock shows up as a black map with no error at all.
      map.current = { maplibregl, m };
      m.resize();
      onReady?.({ resize: () => m.resize(), home: () => m.easeTo({ ...HOME, duration: 1400 }) });

      const ro = new ResizeObserver(() => m.resize());
      ro.observe(host.current);
      observer = ro;

      m.on('load', () => {
        if (cancelled) return;

        // lineMetrics lets a gradient run ALONG the line, which is what makes the light
        // travel rather than just blink.
        m.addSource('routes', { type: 'geojson', data: ROUTES, lineMetrics: true });
        m.addSource('focus', {
          type: 'geojson',
          lineMetrics: true,
          data: { type: 'FeatureCollection', features: [] },
        });

        for (const [id, s] of Object.entries(ROUTE_STYLES)) {
          if (!s.casing) continue;
          m.addLayer({
            id: `route-${id}-casing`,
            type: 'line',
            source: 'routes',
            filter: ['==', ['get', 'id'], id],
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': s.casing, 'line-width': s.width + 2.4, 'line-opacity': 0.85 },
          });
        }
        for (const [id, s] of Object.entries(ROUTE_STYLES)) {
          m.addLayer({
            id: `route-${id}`,
            type: 'line',
            source: 'routes',
            filter: ['==', ['get', 'id'], id],
            layout: { 'line-cap': s.dash ? 'butt' : 'round', 'line-join': 'round' },
            paint: {
              'line-color': s.color,
              'line-width': s.width,
              'line-opacity': 0.9,
              ...(s.dash ? { 'line-dasharray': s.dash } : {}),
            },
          });
          // A pulse of light that runs the length of each corridor, so the lines read as
          // directional instead of drawn-and-dead.
          m.addLayer({
            id: `route-${id}-pulse`,
            type: 'line',
            source: 'routes',
            filter: ['==', ['get', 'id'], id],
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-width': s.width + 1.2,
              'line-opacity': 0.9,
              'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0)'],
            },
          });
        }

        // The line drawn to a selected destination.
        m.addLayer({
          id: 'focus-line',
          type: 'line',
          source: 'focus',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-width': 2.4,
            'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0)'],
          },
        });

        // The project marker — a copper blade with a pulsing halo, deliberately unlike
        // the small ringed dots every other place gets.
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

        // Drive every gradient from one ticker: a head of copper light sweeping 0 → 1
        // along each corridor, offset per corridor so they never march in lockstep.
        const ids = Object.keys(ROUTE_STYLES);
        const t0 = { v: 0 };
        ticker = () => {
          t0.v = (t0.v + 0.0022) % 1;
          ids.forEach((id, k) => {
            const head = (t0.v + k / ids.length) % 1;
            const a = Math.max(0.0001, head - 0.12);
            const b = Math.min(0.9999, head + 0.02);
            if (!m.getLayer(`route-${id}-pulse`)) return;
            m.setPaintProperty(`route-${id}-pulse`, 'line-gradient', [
              'interpolate', ['linear'], ['line-progress'],
              0, 'rgba(0,0,0,0)',
              a, 'rgba(0,0,0,0)',
              head, 'rgba(240,231,211,0.85)',
              b, 'rgba(0,0,0,0)',
              1, 'rgba(0,0,0,0)',
            ]);
          });
        };
        gsap.ticker.add(ticker);

        setLoaded(true);
      });
    })();

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (ticker) gsap.ticker.remove(ticker);
      map.current?.m?.remove?.();
      map.current = null;
    };
  });

  // The halo pulse — the only pulsing element in the app outside the map's own light.
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

  // Category filter.
  useGSAP(
    () => {
      const ctx = map.current;
      if (!ctx) return;
      for (const l of LANDMARKS) {
        const el = markers.current.get(l.id);
        const on = !activeCategory || l.cat === activeCategory || ALWAYS_ON.has(l.cat);
        if (el) el.setAttribute('data-dim', String(!on));
      }
    },
    { dependencies: [activeCategory, loaded] },
  );

  // Selecting a destination: fly so both ends are in frame, and draw the line to it.
  useGSAP(
    () => {
      const ctx = map.current;
      if (!ctx || !loaded) return;
      const { maplibregl, m } = ctx;
      const src = m.getSource('focus');
      if (!src) return;

      const dest = focusId ? CONNECTIVITY_BY_ID[focusId] : null;
      if (!dest) {
        src.setData({ type: 'FeatureCollection', features: [] });
        m.easeTo({ ...HOME, duration: 1400, easing: (t) => 1 - Math.pow(1 - t, 3) });
        return;
      }

      const path = arc([PROJECT.lng, PROJECT.lat], dest.at);
      src.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: path },
      });

      const bounds = new maplibregl.LngLatBounds(path[0], path[0]);
      for (const c of path) bounds.extend(c);
      m.fitBounds(bounds, {
        duration: 1600,
        // Left padding clears the panel; the rest is tight so the pair fills the frame.
        padding: { top: 130, bottom: 150, left: 420, right: 110 },
        maxZoom: 15.5,
        pitch: 54,
        bearing: -12,
        easing: (t) => 1 - Math.pow(1 - t, 3),
      });

      // Draw the line on, then leave a soft trail behind the head.
      const draw = { v: 0 };
      gsap.to(draw, {
        v: 1,
        duration: 1.5,
        ease: E.out,
        onUpdate: () => {
          if (!m.getLayer('focus-line')) return;
          const head = Math.max(0.0002, Math.min(0.9998, draw.v));
          m.setPaintProperty('focus-line', 'line-gradient', [
            'interpolate', ['linear'], ['line-progress'],
            0, 'rgba(202,142,91,0.85)',
            Math.max(0.0001, head - 0.001), 'rgba(202,142,91,0.85)',
            head, 'rgba(240,231,211,1)',
            Math.min(0.9999, head + 0.001), 'rgba(0,0,0,0)',
            1, 'rgba(0,0,0,0)',
          ]);
        },
      });
    },
    { dependencies: [focusId, loaded] },
  );

  useGSAP(
    () => {
      for (const [id, el] of markers.current) {
        el.setAttribute('data-active', String(id === highlightId));
      }
    },
    { dependencies: [highlightId, loaded] },
  );

  const setHost = useCallback((el) => {
    host.current = el;
  }, []);

  // A map pans: its canvas and markers extend past the viewport by design.
  return <div ref={setHost} data-overflow-ok className="blade-map" aria-label="Map of Worli Naka, Mumbai" />;
}
