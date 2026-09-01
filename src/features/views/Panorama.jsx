import { useCallback, useRef, useState } from 'react';
import { gsap, useGSAP } from '../../gsap/Gsapconfig';
import { useEventListener } from '../../hooks/useEventListener';

// An equirectangular 360° viewer in ~120 lines of WebGL.
//
// Written directly against the GL context rather than pulling in three.js: this needs
// one textured sphere and a look-at matrix, and three.js is ~600 kB to get that.
//
// Drag to look. Inertia carries the motion on release and eases out — the same weighted
// deceleration the rest of the app uses, so looking around feels like the transitions.
//
// Unused now — Views.jsx renders through TiledPanorama.jsx (features/plans/) instead, so
// its time-of-day scenes share the same tiled-cubemap pipeline as the floor picker's unit
// views rather than a flat equirectangular JPEG. Left in place rather than deleted.

const VERT = `
attribute vec2 aPos;
uniform mat3 uRot;
uniform float uAspect;
uniform float uFov;
varying vec3 vDir;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
  vec3 dir = vec3(aPos.x * uAspect * uFov, aPos.y * uFov, -1.0);
  vDir = uRot * dir;
}`;

const FRAG = `
precision highp float;
uniform sampler2D uTex;
varying vec3 vDir;
const float PI = 3.14159265359;
void main() {
  vec3 d = normalize(vDir);
  float u = atan(d.x, -d.z) / (2.0 * PI) + 0.5;
  float v = acos(clamp(d.y, -1.0, 1.0)) / PI;
  gl_FragColor = texture2D(uTex, vec2(u, v));
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('[panorama] shader:', gl.getShaderInfoLog(sh));
  }
  return sh;
}

// Yaw then pitch, as a 3×3 in column-major order for WebGL.
function rotation(yaw, pitch) {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return new Float32Array([cy, 0, -sy, sy * sp, cp, cy * sp, sy * cp, -sp, cy * cp]);
}

// uFov is a frustum half-height at z=-1, not degrees — tan(halfAngle) at screen centre.
// 0.62 (the long-standing default, unwound below) works out to a ~64° vertical field.
const DEFAULT_FOV = 0.62;
const fovToUniform = (fovDeg) => (fovDeg == null ? DEFAULT_FOV : Math.tan((fovDeg * Math.PI) / 360));

// Zoom is scroll-wheel and pinch, and it is never part of what a `locked`/pan-windowed
// unit restricts — a fixed framing still lets a visitor lean in on the detail. Bounds
// are generous but not unlimited: ~24° (a tight, zoomed-in look) to ~100° (wider than
// the ~64° default), clamped in `uFov`-uniform space since that's what every zoom step
// actually multiplies.
const ZOOM_MIN = fovToUniform(24);
const ZOOM_MAX = fovToUniform(100);
const clampFov = (v) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v));

// Euclidean distance between exactly two active touch points, for pinch-to-zoom.
const pinchSpan = (pointers) => {
  const [a, b] = pointers.values();
  return Math.hypot(a.x - b.x, a.y - b.y);
};

const TWO_PI = Math.PI * 2;
// Wrap to (-π, π] — the signed "shortest way round" distance, needed to clamp a pan
// window without caring how many full turns a long drag has wound `yaw` through.
const wrapPI = (r) => {
  const m = ((r + Math.PI) % TWO_PI + TWO_PI) % TWO_PI;
  return m - Math.PI;
};

// Keeps `yaw` inside a `panDeg`-wide window — a mechanical stop,
// not a snap-back: dragging keeps working right up to the window's edge and simply can't
// push past it. `panDeg == null` (or ≥360) means no window — fully free. `panDeg === 0`
// means the window has zero width, so every drag is neutralised back to dead centre —
// this is how a fully fixed framing (nothing else on that floor to look toward) is
// expressed, rather than as a separate on/off flag.
function clampToPanWindow(yaw, centerDeg, panDeg) {
  if (panDeg == null || panDeg >= 360) return yaw;
  const center = (centerDeg * Math.PI) / 180;
  const half = (panDeg * Math.PI) / 360;
  const rel = wrapPI(yaw - center);
  const clamped = Math.max(-half, Math.min(half, rel));
  return yaw + (clamped - rel);
}

export function Panorama({
  src,
  className = '',
  onReady,
  initialYaw = 0,
  initialPitch = 0,
  fovDeg = null,
  panDeg = null,
  // The pan window is usually centred on `initialYaw` — the common case in the
  // reference data this follows, one direction with some slack either side. Only pass
  // this when the opening view sits off-centre in its own window (a unit that opens
  // facing one direction but is still free to look toward others, minus whichever
  // belongs to a neighbour — see Office_1 in floorPlanRadarData.js).
  panCenterDeg = null,
}) {
  const canvas = useRef(null);
  const state = useRef({
    yaw: 0,
    pitch: 0,
    vYaw: 0,
    vPitch: 0,
    dragging: false,
    lx: 0,
    ly: 0,
    fov: DEFAULT_FOV,
    // Active touch points by pointerId, and the pinch span they measured last frame —
    // zoom (wheel or pinch) is never gated by `locked`/the pan window, only panning is.
    pointers: new Map(),
    pinchDist: null,
  });
  const [ready, setReady] = useState(false);
  const panCenter = panCenterDeg ?? initialYaw;
  const locked = panDeg === 0;

  useGSAP(
    () => {
      const el = canvas.current;
      if (!el || !src) return undefined;

      // Every photo's own "straight ahead" (yaw 0 → texture u 0.5, see the frag shader
      // below) is whatever direction the drone happened to face at capture, which this
      // viewer has no ground truth for. `initialYaw`/`initialPitch` are therefore a
      // best-effort framing — degrees clockwise from that arbitrary forward, not a true
      // compass bearing — good enough to open roughly toward the unit that was clicked
      // rather than wherever the drone started.
      state.current.yaw = (initialYaw * Math.PI) / 180;
      state.current.pitch = (initialPitch * Math.PI) / 180;
      state.current.vYaw = 0;
      state.current.vPitch = 0;
      state.current.fov = fovToUniform(fovDeg);
      state.current.pointers.clear();
      state.current.pinchDist = null;

      const gl = el.getContext('webgl', { antialias: false, alpha: false });
      if (!gl) {
        console.warn('[panorama] WebGL unavailable');
        return undefined;
      }

      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(prog, 'aPos');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      const uRot = gl.getUniformLocation(prog, 'uRot');
      const uAspect = gl.getUniformLocation(prog, 'uAspect');
      const uFov = gl.getUniformLocation(prog, 'uFov');

      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      // One dark pixel until the panorama decodes, so the stage never flashes white.
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([11, 8, 7]));

      let alive = true;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (!alive) return;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        setReady(true);
        onReady?.();
      };
      img.src = src;

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = el.clientWidth * dpr;
        const h = el.clientHeight * dpr;
        if (el.width !== w || el.height !== h) {
          el.width = w;
          el.height = h;
          gl.viewport(0, 0, w, h);
        }
      };

      const tick = () => {
        const s = state.current;
        if (!s.dragging) {
          // Inertia, then rest. Matches the app's long decelerating tail.
          s.yaw += s.vYaw;
          s.pitch += s.vPitch;
          s.vYaw *= 0.93;
          s.vPitch *= 0.93;
        }
        s.yaw = clampToPanWindow(s.yaw, panCenter, panDeg);
        s.pitch = Math.max(-1.2, Math.min(1.2, s.pitch));
        resize();
        gl.uniformMatrix3fv(uRot, false, rotation(s.yaw, s.pitch));
        gl.uniform1f(uAspect, el.width / Math.max(el.height, 1));
        gl.uniform1f(uFov, s.fov);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };

      gsap.ticker.add(tick);
      return () => {
        alive = false;
        gsap.ticker.remove(tick);
        gl.deleteTexture(tex);
        gl.deleteBuffer(buf);
        gl.deleteProgram(prog);
      };
    },
    { dependencies: [src] },
  );

  // Pan (`locked`/the pan window) and zoom are independent: a second touch point always
  // starts a pinch regardless of `locked`, and panning only ever engages for the first.
  const down = useCallback(
    (e) => {
      const s = state.current;
      s.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      e.currentTarget.setPointerCapture?.(e.pointerId);

      if (s.pointers.size === 2) {
        // A pinch is starting — stop any pan drag/inertia already in flight so the two
        // gestures never fight over `yaw`/`pitch` at once.
        s.dragging = false;
        s.vYaw = 0;
        s.vPitch = 0;
        s.pinchDist = pinchSpan(s.pointers);
        return;
      }

      if (locked || s.pointers.size !== 1) return;
      s.dragging = true;
      s.lx = e.clientX;
      s.ly = e.clientY;
      s.vYaw = 0;
      s.vPitch = 0;
    },
    [locked],
  );

  const move = useCallback(
    (e) => {
      const s = state.current;
      if (!s.pointers.has(e.pointerId)) return;
      s.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (s.pointers.size === 2) {
        const dist = pinchSpan(s.pointers);
        if (s.pinchDist) s.fov = clampFov(s.fov * (s.pinchDist / dist));
        s.pinchDist = dist;
        return;
      }

      if (!s.dragging || locked) return;
      const dx = (e.clientX - s.lx) * 0.0032;
      const dy = (e.clientY - s.ly) * 0.0032;
      s.lx = e.clientX;
      s.ly = e.clientY;
      s.yaw = clampToPanWindow(s.yaw - dx, panCenter, panDeg);
      s.pitch -= dy;
      s.vYaw = -dx;
      s.vPitch = -dy;
    },
    [locked, panCenter, panDeg],
  );

  const up = useCallback((e) => {
    const s = state.current;
    s.pointers.delete(e.pointerId);
    if (s.pointers.size < 2) s.pinchDist = null;
    if (s.pointers.size === 0) s.dragging = false;
  }, []);

  // Arrow keys nudge the view; the section navigator owns them only when not on Views.
  // A locked panorama (panDeg 0 — see floorPlanRadarData.js) ignores them too — it is
  // meant to hold exactly the one framing it opened at, not become a free-look tour.
  useEventListener('keydown', (e) => {
    if (!src || locked) return;
    if (e.key === 'ArrowLeft') state.current.vYaw = 0.02;
    else if (e.key === 'ArrowRight') state.current.vYaw = -0.02;
  });

  // Scroll-wheel zoom. Native, non-passive listener rather than React's onWheel: only
  // that lets preventDefault actually stop the page from scrolling underneath while
  // zooming. Unlike pan, this never checks `locked` — see the ZOOM_MIN/MAX comment.
  const canvasTarget = useCallback(() => canvas.current, []);
  useEventListener(
    'wheel',
    (e) => {
      if (!src) return;
      e.preventDefault();
      state.current.fov = clampFov(state.current.fov * (1 + e.deltaY * 0.001));
    },
    canvasTarget,
    { passive: false },
  );

  if (!src) return null;

  return (
    <canvas
      ref={canvas}
      data-overflow-ok
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      className={`h-full w-full touch-none select-none ${ready && !locked ? 'cursor-grab active:cursor-grabbing' : ''} ${className}`}
      aria-label="360 degree view"
    />
  );
}
