import { useApp } from './appContext';
import { useEventListener } from '../hooks/useEventListener';

// Global keyboard navigation. Screens that own their own arrow keys (Views, Floor Plans)
// handle them locally and stop them reaching here.
export function KeyboardNav() {
  const { stage, goToMenu, goToAdjacent } = useApp();

  useEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

    if (event.key === 'Escape' && stage === 'section') {
      goToMenu();
    } else if (stage === 'section' && (event.key === 'PageDown' || event.key === 'ArrowDown')) {
      if (goToAdjacent(1)) event.preventDefault();
    } else if (stage === 'section' && (event.key === 'PageUp' || event.key === 'ArrowUp')) {
      if (goToAdjacent(-1)) event.preventDefault();
    }
  });

  return null;
}
