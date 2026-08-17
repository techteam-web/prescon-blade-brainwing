import { useMemo, useState } from 'react';
import { useTransition } from '../gsap/useTransition';
import { useOnChange } from '../hooks/useEventListener';
import { AppContext } from './appContext';
import { SECTIONS, SECTION_BY_ID, sectionIndex } from '../data/sections';

export function AppStateProvider({ children }) {
  const t = useTransition({ stage: 'gate' });
  const { view, navigate } = t;

  // Floor Plans' compare mode. It lives up here for one reason: the control that opens
  // it is in the top rail, which is persistent chrome and knows nothing about any
  // screen. The screen owns everything else about it — which floors are picked, and all
  // of the motion.
  //
  //   off → picking → open → closing → off
  //
  // 'closing' exists so the screen can run its exit timeline to completion before the
  // deck is torn down; nothing unmounts until the state lands back on 'off'.
  const [compare, setCompare] = useState('off');
  useOnChange(view.section, () => setCompare('off'));

  const value = useMemo(() => {
    const current = view.section ? SECTION_BY_ID[view.section] : null;

    return {
      ...t,
      compare,
      setCompare,
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
  }, [t, view, navigate, compare]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
