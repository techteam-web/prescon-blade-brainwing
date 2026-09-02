import { useRef, useState } from 'react';
import Marzipano from 'marzipano';
import { useGSAP } from '../../gsap/Gsapconfig';
import { APP_DATA } from '../../data/data';

// The real 360° viewer for both the floor picker's unit views and the Views screen's
// time-of-day panoramas — a Marzipano-tool tiled cubemap export
// (public/assets/panoramas/tiles/<scene id>/, catalogued in src/data/data.js). The old
// flat equirectangular WebGL shader in features/views/Panorama.jsx is unused now that
// Views.jsx renders through this instead; left in place rather than deleted.
//
// The yaw/pitch/pan-window vocabulary is identical to that old shader on purpose — both
// speak this app's own compass frame in degrees (see floorPlanRadar.js) — only the
// rendering backend differs, so floorPlanRadarData.js's overrides mean the same thing
// regardless of which viewer ends up drawing them. Views.jsx doesn't use any of that
// vocabulary itself, though — it renders each scene at TiledPanorama's own defaults
// (yaw/pitch 0, fully free-look), since a time-of-day view has no per-room compass to
// calibrate against, unlike a floor's individual sellable units.

const DEG = Math.PI / 180;
const TWO_PI = Math.PI * 2;
const wrapPI = (r) => {
  const m = ((r + Math.PI) % TWO_PI + TWO_PI) % TWO_PI;
  return m - Math.PI;
};

// Marzipano's own `.yaw(min, max)` limiter is a plain, non-wrapping clamp — no good for
// a window that sits anywhere on the circle, including across the ±π seam (Office_1's
// south-through-west window does exactly that). This is the same "mechanical stop" as
// clampToPanWindow in features/views/Panorama.jsx, as a Marzipano view limiter instead.
function windowYawLimiter(centerRad, panRad) {
  if (panRad == null || panRad >= TWO_PI) return (params) => params;
  const half = panRad / 2;
  return function limitYawWindow(params) {
    const rel = wrapPI(params.yaw - centerRad);
    const clamped = Math.max(-half, Math.min(half, rel));
    params.yaw += clamped - rel;
    return params;
  };
}

// Individual control methods vs. the named groups Marzipano's own default controls
// register them under (see node_modules/marzipano/src/controls/registerDefaultControls
// — `disableMethod` throws on a group id, and `disableMethodGroup` throws on a bare
// method id, so the two lists have to stay separate).
const PAN_METHODS = ['mouseViewDrag', 'touchView'];
const PAN_METHOD_GROUPS = ['arrowKeys', 'wasdKeys', 'qeKeys'];

// Idle-triggered, not immediate: starts `IDLE_MS` after load (or after the last drag),
// so a visitor who starts looking around right away never fights a spin already in
// motion. Marzipano's own setIdleMovement owns the timer and stops it the moment a drag
// starts, restarting the count after — see stopMovementHandler in node_modules/marzipano.
const IDLE_MS = 1200;
// Full turn in ~2 minutes — a slow drift meant to be glanced at, not watched.
const AUTOROTATE_YAW_SPEED = 0.05;

export function TiledPanorama({
  sceneId,
  initialYaw = 0,
  initialPitch = 0,
  fovDeg = null,
  panDeg = null,
  panCenterDeg = null,
  pitchMinDeg = -90,
  pitchMaxDeg = 90,
  // Only meaningful for an unrestricted (panDeg null/≥360) view — a floor unit's pan
  // window is a deliberate framing choice, not something that should drift on its own.
  autorotate = false,
  className = '',
  onReady,
  // Fired with the scene's own raw yaw, in degrees, every time the view moves — drag,
  // inertia, or autorotate. Same raw frame as `initialYaw` (see UnitPanoramaViewer's
  // northDeg translation), not yet a compass bearing — feeds the radar's look-direction
  // cone (PanoramaFloorRadar.jsx). rAF-throttled to one call per frame regardless of how
  // many 'change' events Marzipano fires in between.
  onViewChange,
}) {
  const container = useRef(null);
  const [, setReady] = useState(false);

  useGSAP(
    () => {
      const el = container.current;
      const scene = APP_DATA.scenes.find((s) => s.id === sceneId);
      if (!el || !scene) return undefined;

      const viewer = new Marzipano.Viewer(el, { controls: { mouseViewMode: 'drag' } });

      const source = Marzipano.ImageUrlSource.fromString(
        `/assets/panoramas/tiles/${scene.id}/{z}/{f}/{y}/{x}.jpg`,
        { cubeMapPreviewUrl: `/assets/panoramas/tiles/${scene.id}/preview.jpg` },
      );
      const geometry = new Marzipano.CubeGeometry(scene.levels);

      const panCenter = (panCenterDeg ?? initialYaw) * DEG;
      // Zoom is never part of what `panDeg` restricts — see the ZOOM_MIN/MAX comment on
      // the flat viewer for why: a fixed framing still lets a visitor lean in on detail.
      const limiter = Marzipano.util.compose(
        Marzipano.RectilinearView.limit.resolution(scene.faceSize),
        Marzipano.RectilinearView.limit.vfov(24 * DEG, 100 * DEG),
        Marzipano.RectilinearView.limit.pitch(pitchMinDeg * DEG, pitchMaxDeg * DEG),
        windowYawLimiter(panCenter, panDeg == null ? null : panDeg * DEG),
      );

      const view = new Marzipano.RectilinearView(
        {
          yaw: initialYaw * DEG,
          pitch: initialPitch * DEG,
          fov: fovDeg != null ? fovDeg * DEG : scene.initialViewParameters.fov,
        },
        limiter,
      );

      const mzScene = viewer.createScene({ source, geometry, view, pinFirstLevel: true });
      mzScene.switchTo();
      setReady(true);
      onReady?.();

      let pendingFrame = null;
      const reportView = () => {
        if (pendingFrame != null) return;
        pendingFrame = requestAnimationFrame(() => {
          pendingFrame = null;
          onViewChange?.((view.yaw() * 180) / Math.PI);
        });
      };
      view.addEventListener('change', reportView);
      reportView();

      if (autorotate) {
        viewer.setIdleMovement(
          IDLE_MS,
          Marzipano.autorotate({ yawSpeed: AUTOROTATE_YAW_SPEED, targetPitch: null }),
        );
      }

      // A locked unit (panDeg 0) drops the pan controls outright rather than relying on
      // the limiter alone — dragging visibly straining against a wall it can't move past
      // reads as broken, not "there's nothing else to see here". Zoom controls are
      // deliberately left out of this list.
      if (panDeg === 0) {
        const controls = viewer.controls();
        for (const id of PAN_METHODS) controls.disableMethod(id);
        for (const id of PAN_METHOD_GROUPS) controls.disableMethodGroup(id);
      }

      return () => {
        view.removeEventListener('change', reportView);
        if (pendingFrame != null) cancelAnimationFrame(pendingFrame);
        viewer.destroy();
      };
    },
    {
      dependencies: [
        sceneId,
        initialYaw,
        initialPitch,
        fovDeg,
        panDeg,
        panCenterDeg,
        pitchMinDeg,
        pitchMaxDeg,
        autorotate,
      ],
    },
  );

  if (!sceneId) return null;

  return <div ref={container} className={`h-full w-full ${className}`} aria-label="360 degree view" />;
}
