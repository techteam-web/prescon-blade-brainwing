import { memo, useCallback } from 'react';
import { useApp } from './appContext';
import { SECTION_SCREENS, STAGE_SCREENS } from './screens';

// One absolutely-positioned host per render-list entry. Both the outgoing and the
// incoming screen are mounted through a transition so they can overlap; the outgoing
// one is hidden imperatively at the 'swap' label and unmounted a beat later.
//
// ScreenHost is memo'd and its entry object is referentially stable across the swap
// render, so the DOM node keeps its identity while GSAP holds a direct reference to it.
// It never sets its own transform or opacity — the director owns those.
const ScreenHost = memo(function ScreenHost({ entry, register }) {
  const ref = useCallback((el) => register(entry.key, el), [entry.key, register]);
  const Screen =
    entry.stage === 'section' ? SECTION_SCREENS[entry.section] : STAGE_SCREENS[entry.stage];

  return (
    <div
      ref={ref}
      data-screen={entry.section ?? entry.stage}
      className="absolute inset-0 h-full w-full overflow-hidden"
    >
      {Screen ? <Screen /> : null}
    </div>
  );
});

export function Stage() {
  const { renderList, registerScreen, stageRef } = useApp();

  return (
    <div ref={stageRef} id="stage" className="absolute inset-0 overflow-hidden">
      {renderList.map((entry) => (
        <ScreenHost key={entry.key} entry={entry} register={registerScreen} />
      ))}
    </div>
  );
}
