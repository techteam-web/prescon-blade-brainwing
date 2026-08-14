import { useCallback, useRef } from 'react';
import { gsap, useGSAP } from '../gsap/Gsapconfig';
import { useEventListener } from './useEventListener';

// LAW 1 enforcement, in development only. Compiled out of production by the
// import.meta.env.DEV guard.
//
// Two checks, because one is not enough:
//   1. Subtree scan for scrollHeight/scrollWidth exceeding the client box.
//   2. Rect containment of every leaf against the screen rect — this catches
//      absolutely-positioned children that `overflow: hidden` clips silently and that
//      scrollHeight under-reports.
//
// Findings are grouped in the console, outlined in magenta, and pushed to
// window.__BLADE__.overflows so a headless viewport sweep can assert on them.

const TOLERANCE = 1;
// Tight leading (line-height 1.18) means a glyph box routinely stands a few px taller
// than its line box. That is the brand, not a violation, so vertical spill under this
// threshold is ignored.
const LEADING_SLACK = 8;

// Paint offenders only when asked: an always-on outline shows up in screenshots and
// review builds and reads as a design decision.
const OUTLINE =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('overflow');

function screenRectOf(root) {
  const r = root.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
}

function describe(el) {
  const id = el.id ? `#${el.id}` : '';
  const cls = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}` : '';
  const data = el.dataset?.screen ? `[data-screen="${el.dataset.screen}"]` : '';
  return `${el.tagName.toLowerCase()}${id}${cls}${data}`;
}

export function useOverflowGuard(ref, label) {
  const reported = useRef(new Set());

  const check = useCallback(() => {
    if (!import.meta.env.DEV) return;
    const root = ref.current;
    if (!root || !root.isConnected) return;

    // Refuse to measure a screen that is still being transformed. Mid-transition a
    // screen can be at scaleY(0.02), which makes its own rect ~20px tall; every child
    // then "escapes" it, and a degenerate matrix can push a child's rect out to ~1e17.
    // Those are artefacts of the measurement, not layout faults, and reporting them
    // would train everyone to ignore this guard.
    for (let el = root; el && el !== document.body; el = el.parentElement) {
      const t = getComputedStyle(el).transform;
      if (t && t !== 'none' && t !== 'matrix(1, 0, 0, 1, 0, 0)') return;
    }

    const findings = [];
    const bounds = screenRectOf(root);
    if (!(bounds.right - bounds.left > 1) || !(bounds.bottom - bounds.top > 1)) return;

    for (const el of root.querySelectorAll('*')) {
      if (el.closest('[data-overflow-ok]')) continue;
      if (el.classList.contains('sr-only')) continue;

      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;

      // scrollHeight > clientHeight only means something on an element that could
      // actually scroll. On an `overflow: visible` box the content simply paints outside
      // and is clipped by the Screen — which is the design, not a violation. Checking it
      // everywhere reports every tight-leading line box as an overflow.
      // A real scroll container is forbidden outright — that is LAW 1 broken, not bent.
      if (style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowX === 'auto' || style.overflowX === 'scroll') {
        findings.push({ el, why: 'is a scroll container — LAW 1 forbids scrolling anywhere' });
        continue;
      }

      const scrollable = style.overflow !== 'visible' && style.overflowY !== 'visible';
      if (
        scrollable &&
        (el.scrollHeight - el.clientHeight > LEADING_SLACK ||
          el.scrollWidth - el.clientWidth > LEADING_SLACK)
      ) {
        findings.push({
          el,
          why: `content ${el.scrollWidth}×${el.scrollHeight} exceeds box ${el.clientWidth}×${el.clientHeight}`,
        });
        continue;
      }

      // Leaf-level containment. Only leaves, or every ancestor reports the same spill.
      if (el.children.length) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (!Number.isFinite(r.left) || !Number.isFinite(r.top) || !Number.isFinite(r.right) || !Number.isFinite(r.bottom)) continue;
      const over =
        Math.max(0, bounds.left - r.left) +
        Math.max(0, r.right - bounds.right) +
        Math.max(0, bounds.top - r.top) +
        Math.max(0, r.bottom - bounds.bottom);
      // A spill larger than the viewport is a measurement artefact, not a layout fault.
      if (over > TOLERANCE && over < Math.max(window.innerWidth, window.innerHeight)) {
        findings.push({ el, why: `escapes the screen rect by ${Math.round(over)}px` });
      }
    }

    const store = (window.__BLADE__ ??= {});
    store.overflows ??= [];

    if (!findings.length) return;

    const key = `${label}:${findings.length}:${findings[0] ? describe(findings[0].el) : ''}`;
    for (const f of findings) {
      if (OUTLINE) f.el.style.outline = '2px solid magenta';
      store.overflows.push({ screen: label, node: describe(f.el), why: f.why });
    }
    if (reported.current.has(key)) return;
    reported.current.add(key);

    console.groupCollapsed(
      `%cLAW 1 violation on "${label}" — ${findings.length} element(s) overflow`,
      'color:#CA8E5B;font-weight:600',
    );
    for (const f of findings) console.warn(describe(f.el), '—', f.why, f.el);
    console.groupEnd();
  }, [ref, label]);

  // Two things make an early check lie: fonts that have not loaded yet change every
  // metric, and a transition in flight leaves elements mid-transform, which inflates
  // the scroll area of their ancestors. Wait for both.
  useGSAP(
    () => {
      if (!import.meta.env.DEV) return;
      let waited = 0;
      const settle = () => {
        if (document.documentElement.hasAttribute('data-busy') && waited < 8) {
          waited += 1;
          gsap.delayedCall(0.4, settle);
          return;
        }
        check();
      };
      const start = () => gsap.delayedCall(0.15, settle);
      if (document.fonts?.status === 'loaded') start();
      else document.fonts?.ready.then(start);
    },
    { dependencies: [label] },
  );

  useEventListener('resize', check);
}
