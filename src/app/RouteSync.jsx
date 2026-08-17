import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from './appContext';
import { pathFor, targetFor } from './routes';
import { useEventListener, useOnChange } from '../hooks/useEventListener';
import { plateSlide } from '../gsap/TransitionDirector';

// React Router owns the URL; the GSAP state machine still owns the transition.
//
// Those two have to agree without fighting, so each event flows one way only:
//
//   a menu row is clicked  → state machine moves → this writes the new URL
//   back / forward / paste → the URL changes     → this asks the state machine to move
//
// A ref records the last path this component itself wrote, so a push it just made never
// comes back in as an inbound navigation and starts a loop.

export function RouteSync() {
  const { stage, section, navigate: go, isTransitioning } = useApp();
  const routerNavigate = useNavigate();
  const lastWritten = useRef(null);
  // React Router's history keeps a monotonic `idx` in history.state; comparing it across
  // a popstate is how we tell "back" from "forward" — the event itself carries no direction.
  const idxRef = useRef(window.history.state?.idx ?? 0);

  // App → URL. The gate has no URL of its own; it sits over whatever is beneath.
  const want = stage === 'gate' ? null : pathFor(stage, section);

  useOnChange(want, (next) => {
    if (!next || next === window.location.pathname) return;
    lastWritten.current = next;
    routerNavigate(next);
  });

  // URL → app. Only for changes this component did not just make. Never mid-transition:
  // the navigation lock would reject it and the URL and the screen would drift apart.
  useEventListener('popstate', () => {
    const prevIdx = idxRef.current;
    const nextIdx = window.history.state?.idx ?? prevIdx;
    idxRef.current = nextIdx;

    const path = window.location.pathname;
    if (path === lastWritten.current || isTransitioning) return;
    const target = targetFor(path);
    if (!target) return;
    if (target.stage === stage && target.section === section) return;
    lastWritten.current = path;

    // Section ↔ section otherwise falls through to bladeSweep's vertical curtain — right
    // for a forward click, but reads as the screen "closing" when the browser is just
    // stepping back/forward through history. Use the side-in blade instead, so back and
    // forward slide from the side that matches the direction the user actually pressed.
    const opts =
      target.stage === 'section' && stage === 'section'
        ? { direction: nextIdx < prevIdx ? 'back' : 'forward', transition: plateSlide }
        : {};
    go(target.section ? target.section : { stage: target.stage }, opts);
  });

  return null;
}
