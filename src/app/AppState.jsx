<<<<<<< HEAD
import { useCallback, useMemo, useState } from 'react';
=======
import { useMemo, useState } from 'react';
>>>>>>> origin/main
import { useTransition } from '../gsap/useTransition';
import { useOnChange } from '../hooks/useEventListener';
import { AppContext } from './appContext';
import { SECTIONS, SECTION_BY_ID, sectionIndex } from '../data/sections';
import { MAX_COMPARE } from '../data/towerZones';

export function AppStateProvider({ children }) {
  const t = useTransition({ stage: 'gate' });
  const { view, navigate } = t;

<<<<<<< HEAD
  // Floor-compare selection. Lives here rather than inside the Plans screen because the
  // top rail's Compare control (visible while on Plans) needs to read and act on it, and
  // the rail sits outside whichever screen is currently mounted.
  const [compareIds, setCompareIds] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const toggleCompare = useCallback((id) => {
    setCompareIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= MAX_COMPARE
          ? prev
          : [...prev, id],
    );
  }, []);

  const removeCompare = useCallback((id) => {
    setCompareIds((prev) => prev.filter((x) => x !== id));
  }, []);
=======
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
>>>>>>> origin/main

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

      compareIds,
      compareOpen,
      setCompareOpen,
      toggleCompare,
      removeCompare,

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
<<<<<<< HEAD
  }, [t, view, navigate, compareIds, compareOpen, toggleCompare, removeCompare]);
=======
  }, [t, view, navigate, compare]);
>>>>>>> origin/main

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
