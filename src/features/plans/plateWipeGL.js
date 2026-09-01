// Minimal hand-rolled WebGL1 renderer for the floor-plate wipe. No three.js — this is the
// only place in the app that touches raw WebGL, and it exists purely to drive one shader
// (a noise-warped band sweeping across the plan panel on floor change).

const VERTEX = `
  attribute vec2 aPosition;
  varying vec2 vUv;

  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const FRAGMENT = `
  precision highp float;

  uniform float uProgress;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    f = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;

    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.0 + vec2(13.7, 9.1);
      a *= 0.5;
    }

    return v;
  }

  void main() {
    vec2 p = vUv * 3.0;
    float t = uProgress * 3.14;

    vec2 warp = vec2(
      fbm(p + vec2(0.0, t * 0.2)),
      fbm(p + vec2(5.2, 1.3) - vec2(t * 0.15, 0.0))
    );

    float w = fbm(p + 0.9 * warp);

    float waves =
      sin(vUv.x * 6.0 + t) * 0.03 +
      sin(vUv.x * 13.0 - t) * 0.012;

    float wipe = vUv.y + (w - 0.5) * 0.3 + waves;

    float coverP = smoothstep(0.0, 0.55, uProgress);
    float clearP = smoothstep(0.45, 1.0, uProgress);

    float frontPos = coverP * 2.2 - 0.35;
    float backPos = clearP * 2.2 - 0.35;

    float covered = smoothstep(wipe - 0.1, wipe + 0.1, frontPos);
    float cleared = smoothstep(wipe - 0.1, wipe + 0.1, backPos);

    float band = covered - cleared;

    float dEdge = min(frontPos - wipe, wipe - backPos);
    float body = smoothstep(0.05, 0.6, dEdge);

    float hide = 1.0 - smoothstep(0.08, 0.18, abs(uProgress - 0.5));

    float alpha = band * mix(0.3, 1.0, max(body, hide));

    float tint = clamp(1.0 - body + (w - 0.5) * 0.4, 0.0, 1.0);

    vec3 color = mix(uColorA, uColorB, tint);

    // A shared scalar, not three independent per-channel sines — that version phase-offset
    // R/G/B by ~120° each, which is a rainbow generator, not a shimmer: against colors this
    // dark a ±0.03 per-channel drift reads as visible green/magenta blotches sweeping across
    // the panel instead of the warm, single-tone sheen this is meant to be.
    color += 0.03 * sin(w * 8.0 + t);

    float frontGlow = 1.0 - smoothstep(0.0, 0.25, abs(frontPos - wipe));
    float backGlow = 1.0 - smoothstep(0.0, 0.25, abs(backPos - wipe));

    color += (frontGlow + backGlow) * 0.12;

    gl_FragColor = vec4(color, alpha);
  }
`;

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed: ${log}`);
  }
  return shader;
}

// uColorA/B default to --color-blade-black-2 and --color-blade-ink (see theme.css) — the
// same dark card ground the plan panel now sits on, so the wipe reads as the panel
// itself sweeping rather than a foreign color passing over it.
export function createPlateWipe(canvas, { colorA = '#241a15', colorB = '#3a302b' } = {}) {
  let gl;
  try {
    gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      depth: false,
      stencil: false,
    });
  } catch {
    gl = null;
  }
  if (!gl) return null;

  let program;
  let vertexShader;
  let fragmentShader;
  try {
    vertexShader = compile(gl, gl.VERTEX_SHADER, VERTEX);
    fragmentShader = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Program link failed: ${gl.getProgramInfoLog(program)}`);
    }
  } catch (err) {
    console.error(err);
    return null;
  }

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const aPosition = gl.getAttribLocation(program, 'aPosition');
  const uProgress = gl.getUniformLocation(program, 'uProgress');
  const uColorA = gl.getUniformLocation(program, 'uColorA');
  const uColorB = gl.getUniformLocation(program, 'uColorB');

  gl.useProgram(program);
  gl.uniform3fv(uColorA, hexToRgb(colorA));
  gl.uniform3fv(uColorB, hexToRgb(colorB));

  let width = 0;
  let height = 0;

  function resize(cssWidth, cssHeight, dpr) {
    const w = Math.max(1, Math.round(cssWidth * dpr));
    const h = Math.max(1, Math.round(cssHeight * dpr));
    if (w === width && h === height) return;
    width = w;
    height = h;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
  }

  function render(progress) {
    if (!width || !height) return;
    gl.useProgram(program);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uProgress, progress);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function dispose() {
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
  }

  return { resize, render, dispose };
}
