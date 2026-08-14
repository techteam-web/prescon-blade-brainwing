import { SECTION_IDS } from '../data/sections';

// Path ⇄ app-state mapping. Split out of RouteSync.jsx so that file exports a component
// and nothing else, which is what keeps Fast Refresh working.

const STAGE_PATHS = { gate: '/', intro: '/', landing: '/', menu: '/menu' };

export const pathFor = (stage, section) =>
  stage === 'section' && section ? `/${section}` : (STAGE_PATHS[stage] ?? '/');

export function targetFor(pathname) {
  const slug = pathname.replace(/^\/+|\/+$/g, '');
  if (!slug) return { stage: 'landing', section: null };
  if (slug === 'menu') return { stage: 'menu', section: null };
  if (SECTION_IDS.includes(slug)) return { stage: 'section', section: slug };
  return null;
}

// Captured once, at module load, before React has rendered or the gate has written
// anything to the address bar. A deep link has to be read here or not at all: the moment
// the gate is cleared the app navigates to the landing and overwrites the path.
export const INITIAL_TARGET =
  typeof window === 'undefined' ? null : targetFor(window.location.pathname);
