import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from './appContext';
import { pathFor, targetFor } from './routes';
import { useEventListener, useOnChange } from '../hooks/useEventListener';

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
    const path = window.location.pathname;
    if (path === lastWritten.current || isTransitioning) return;
    const target = targetFor(path);
    if (!target) return;
    if (target.stage === stage && target.section === section) return;
    lastWritten.current = path;
    go(target.section ? target.section : { stage: target.stage });
  });

  return null;
}
