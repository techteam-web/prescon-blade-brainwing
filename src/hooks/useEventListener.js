import { useEffect, useRef } from 'react';

// The only bare useEffect in the codebase.
//
// §5.2 bans `useEffect` + gsap — every animation goes through useGSAP. A DOM event
// listener is not an animation, and wrapping one in useGSAP would be a lie about what
// it does. Centralising them here means no feature file ever writes a raw effect, and
// a grep for `useEffect` outside this file should return nothing.

export function useEventListener(type, handler, target = window, options) {
  const saved = useRef(handler);
  // Assigned in an effect, never during render.
  useEffect(() => {
    saved.current = handler;
  });

  useEffect(() => {
    const el = typeof target === 'function' ? target() : target;
    if (!el?.addEventListener || !type) return;
    const listener = (event) => saved.current?.(event);
    el.addEventListener(type, listener, options);
    return () => el.removeEventListener(type, listener, options);
    // `options` is intentionally not a dependency: callers pass object literals.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, target]);
}

// Same contract for a media query, which is the other non-animation subscription the
// app needs (reduced motion, pointer type, breakpoint).
export function useMediaListener(query, handler) {
  const saved = useRef(handler);
  useEffect(() => {
    saved.current = handler;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(query);
    const listener = (event) => saved.current?.(event.matches, event);
    saved.current?.(mq.matches, null);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [query]);
}

// Deferred, low-priority work (asset preloading). Also not an animation, so it lives
// here with the other non-animation subscriptions rather than inside a feature file.
export function useIdleTask(task, deps = []) {
  const saved = useRef(task);
  useEffect(() => {
    saved.current = task;
  });

  useEffect(() => {
    // The task may return its own cleanup — keep it, or anything it sets up (a map, an
    // observer, an in-flight import) can never be torn down.
    let dispose;
    const run = () => {
      dispose = saved.current?.();
    };
    const id = window.requestIdleCallback
      ? window.requestIdleCallback(run, { timeout: 1200 })
      : window.setTimeout(run, 400);
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
      if (typeof dispose === 'function') dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
