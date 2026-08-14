import { useCallback, useRef, useState } from 'react';
import { gsap, useGSAP } from '../../gsap/Gsapconfig';
import { useEventListener } from '../../hooks/useEventListener';

// An equirectangular 360° viewer in ~120 lines of WebGL.
//
// Written directly against the GL context rather than pulling in three.js: this needs
// one textured sphere and a look-at matrix, and three.js is ~600 kB to get that. The
// whole point of the Views screen is that the image loads instantly and drags at 60fps.
//
// Drag to look. Inertia carries the motion on release and eases out — the same weighted
// deceleration the rest of the app uses, so looking around feels like the transitions.

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

export function Panorama({ src, className = '', onReady }) {
  const canvas = useRef(null);
  const state = useRef({ yaw: 0, pitch: 0, vYaw: 0, vPitch: 0, dragging: false, lx: 0, ly: 0 });
  const [ready, setReady] = useState(false);

  useGSAP(
    () => {
      const el = canvas.current;
      if (!el || !src) return undefined;

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
        s.pitch = Math.max(-1.2, Math.min(1.2, s.pitch));
        resize();
        gl.uniformMatrix3fv(uRot, false, rotation(s.yaw, s.pitch));
        gl.uniform1f(uAspect, el.width / Math.max(el.height, 1));
        gl.uniform1f(uFov, 0.62);
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

  const down = useCallback((e) => {
    const s = state.current;
    s.dragging = true;
    s.lx = e.clientX;
    s.ly = e.clientY;
    s.vYaw = 0;
    s.vPitch = 0;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, []);

  const move = useCallback((e) => {
    const s = state.current;
    if (!s.dragging) return;
    const dx = (e.clientX - s.lx) * 0.0032;
    const dy = (e.clientY - s.ly) * 0.0032;
    s.lx = e.clientX;
    s.ly = e.clientY;
    s.yaw -= dx;
    s.pitch -= dy;
    s.vYaw = -dx;
    s.vPitch = -dy;
  }, []);

  const up = useCallback(() => {
    state.current.dragging = false;
  }, []);

  // Arrow keys nudge the view; the section navigator owns them only when not on Views.
  useEventListener('keydown', (e) => {
    if (!src) return;
    if (e.key === 'ArrowLeft') state.current.vYaw = 0.02;
    else if (e.key === 'ArrowRight') state.current.vYaw = -0.02;
  });

  if (!src) return null;

  return (
    <canvas
      ref={canvas}
      data-overflow-ok
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      className={`h-full w-full touch-none select-none ${ready ? 'cursor-grab active:cursor-grabbing' : ''} ${className}`}
      aria-label="360 degree view"
    />
  );
}
