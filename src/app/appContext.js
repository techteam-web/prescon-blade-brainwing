import { createContext, useContext } from 'react';

// Split from AppState.jsx so that file exports a component and nothing else — which is
// what keeps Fast Refresh working across the whole app.
export const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppStateProvider>');
  return ctx;
}
