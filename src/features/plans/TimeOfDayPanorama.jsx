import { useEffect, useRef, useState } from 'react';
import Marzipano from 'marzipano';
import { useGSAP } from '../../gsap/Gsapconfig';
import { APP_DATA } from '../../data/data';

// The Views screen's day/evening/twilight panels are the same drone vantage point shot
// three times, so — unlike TiledPanorama, which tears down and rebuilds Marzipano for
// every genuinely different scene (a floor unit's own framing) — this keeps ONE viewer
// and ONE shared view alive across all three, and swaps between them with Marzipano's
// own viewer.switchTo(scene, {transitionDuration}) crossfade. Remounting a fresh viewer
// per time-of-day (the old approach) meant a brand new WebGL context and a fresh tile
// fetch every switch — the ~1s blank/black flash while those tiles streamed back in.
// Crossfading dissolves directly between two already-loaded textures instead.

const DEG = Math.PI / 180;
const IDLE_MS = 1200;
// Same slow drift as TiledPanorama's own autorotate — kept in sync intentionally.
const AUTOROTATE_YAW_SPEED = 0.05;
const CROSSFADE_MS = 900;

export function TimeOfDayPanorama({ scenes, activeIndex, autorotate = false, className = '', onViewChange }) {
  const container = useRef(null);
  const scenesBySceneId = useRef(new Map());
  const [ready, setReady] = useState(false);

  useGSAP(
    () => {
      const el = container.current;
      const withScene = scenes.filter((s) => s.sceneId);
      if (!el || withScene.length === 0) return undefined;

      const viewer = new Marzipano.Viewer(el, { controls: { mouseViewMode: 'drag' } });
      const first = APP_DATA.scenes.find((s) => s.id === withScene[0].sceneId);

      // One shared view across every scene: since they're the same physical vantage
      // point, reusing it is what makes the crossfade hold yaw/pitch/fov steady instead
      // of snapping to each scene's own defaults.
      const view = new Marzipano.RectilinearView(
        { yaw: 0, pitch: 0, fov: first.initialViewParameters.fov },
        Marzipano.util.compose(
          Marzipano.RectilinearView.limit.resolution(first.faceSize),
          Marzipano.RectilinearView.limit.vfov(24 * DEG, 90 * DEG),
        ),
      );

      const map = new Map();
      for (const { sceneId } of withScene) {
        const scene = APP_DATA.scenes.find((s) => s.id === sceneId);
        const source = Marzipano.ImageUrlSource.fromString(
          `/assets/panoramas/tiles/${sceneId}/{z}/{f}/{y}/{x}.jpg`,
        );
        const geometry = new Marzipano.CubeGeometry(scene.levels);
        map.set(sceneId, viewer.createScene({ source, geometry, view, pinFirstLevel: true }));
      }
      scenesBySceneId.current = map;

      const startSceneId = scenes[activeIndex]?.sceneId ?? withScene[0].sceneId;
      map.get(startSceneId)?.switchTo();
      setReady(true);

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

      return () => {
        view.removeEventListener('change', reportView);
        if (pendingFrame != null) cancelAnimationFrame(pendingFrame);
        scenesBySceneId.current = new Map();
        setReady(false);
        viewer.destroy();
      };
      // `scenes` is the fixed PANORAMAS list — built once, not on every index change.
    },
    { dependencies: [autorotate] },
  );

  useEffect(() => {
    if (!ready) return;
    const sceneId = scenes[activeIndex]?.sceneId;
    if (!sceneId) return;
    scenesBySceneId.current.get(sceneId)?.switchTo({ transitionDuration: CROSSFADE_MS });
  }, [activeIndex, ready, scenes]);

  return <div ref={container} className={`h-full w-full ${className}`} aria-label="360 degree view" />;
}
