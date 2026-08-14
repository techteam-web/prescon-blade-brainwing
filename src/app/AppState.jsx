import { useMemo } from 'react';
import { useTransition } from '../gsap/useTransition';
import { AppContext } from './appContext';
import { SECTIONS, SECTION_BY_ID, sectionIndex } from '../data/sections';

export function AppStateProvider({ children }) {
  const t = useTransition({ stage: 'gate' });
  const { view, navigate } = t;

  const value = useMemo(() => {
    const current = view.section ? SECTION_BY_ID[view.section] : null;

    return {
      ...t,
      stage: view.stage,
      section: view.section,
      prevSection: view.prevSection,
      current,
      renderList: view.renderList,

      goTo: (sectionId, opts) => navigate(sectionId, opts),
      goToMenu: () => navigate({ stage: 'menu' }),
      goToLanding: () => navigate({ stage: 'landing' }),
      startIntro: () => navigate({ stage: 'intro' }),

      // Adjacent-section movement, used by keyboard nav. Stops at the ends rather than
      // wrapping: this is a document, not a carousel.
      goToAdjacent: (delta) => {
        if (view.stage !== 'section') return false;
        const next = SECTIONS[sectionIndex(view.section) + delta];
        return next ? navigate(next.id) : false;
      },
    };
  }, [t, view, navigate]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
